# 2026-10 codeforces / misc 작업 로그

관련 canonical: `.agent/docs/current/codeforces/api-failure-handling.md`

## Sentry MAZACOFO-3: Codeforces 일시 장애가 `Unknown error`로 쌓이던 문제

- 이슈: https://kodori.sentry.io/issues/MAZACOFO-3 (`CodeforcesError: Unknown error`)
- 2025-07-21부터 6,700건 이상, 조사 시점(2026-10-19)에도 시간당 1~2건
- 위치: `SchedulerService.updateCodeforcesData` (매분 크론) → `getBulkCodeforcesProfile` → `getCodeforcesProfile` 62행

### Sentry 이벤트로 확인한 사실

90일 보존분 853건 전부의 breadcrumb를 확인했다 (2026-07-20 ~ 2026-10-18).
Sentry Node SDK는 HTTP breadcrumb 레벨을 상태 코드로 정한다 (4xx → `warning`, 5xx → `error`, 응답 없음·4xx 미만 → `info`).
GET breadcrumb의 `status_code` 값은 쿼리 문자열(약 2,000자)이 길어 저장 과정에서 잘렸으므로 레벨로 분류했다.

| `user.info` GET 결과 | 건수 | 크론 시작 후 응답까지 (중앙값) |
|---|---|---|
| 5xx | 408 (48%) | 15.3초 (대부분 12~30초, 게이트웨이 타임아웃 양상) |
| 4xx | 144 (17%) | 0.7초 |
| 응답 없음 또는 4xx 미만 | 105 (12%) | 5.0초 |
| HTTP breadcrumb 자체가 없음 (완결된 응답 없음) | 196 (23%) | - |

- `HEAD https://codeforces.com/profile/<핸들;핸들;...>` 은 HEAD breadcrumb가 남은 657건 전부 403.
  이어 붙인 핸들 문자열은 프로필 URL이 아니므로 이름 변경 확인은 항상 실패했다.
- Codeforces의 "핸들 없음"은 `HTTP 400 + {"status":"FAILED","comment":"handles: User with handle X not found"}` 다(직접 호출로 확인).
  기존 코드는 이를 `Profile not found` 로 던지므로 `Unknown error` 4xx 144건은 핸들 없음이 아니다.
- 853건 중 286건은 앞뒤 1분에 실패가 없는 단발성. 5분 이상 연속은 17번, 최장 174분(2026-08-20 16:21 UTC~).
- 같은 1분에 이벤트 2건이 찍힌 경우 17번. axios 타임아웃이 없어 이전 실행이 끝나기 전에 다음 크론이 겹쳤다.
- 크론 모니터 `update-codeforces-data` 정상 실행 시간은 2.6~5초. 실패한 다음 분에는 대부분 다시 `ok`.

### 근본 원인

외부 장애 자체는 Codeforces 쪽 일시 문제(5xx, 빠른 4xx 차단 응답, 연결 실패)다. 이것이 error 이벤트 6,700건이 된 것은 코드 구조 탓이다.

1. 모든 핸들을 `user.info` 한 번에 요청하면서 타임아웃도 재시도도 없었다.
2. 어떤 실패든 `checkIfHandleIsRenamed(이어 붙인 핸들 문자열)` 를 먼저 호출했다. 항상 403이라 쓸모없는 요청만 한 번 더 보냈다.
3. 상태 코드와 응답 내용을 버리고 전부 `new CodeforcesError('Unknown error')` 로 바꿨다. Nest `Logger` 출력은 Sentry로 가지 않아 원인이 남지 않았다.
4. 스케줄러가 예외를 다시 던졌고 `@SentryCron` 이 `captureException` 해서 단발성 실패마다 error 이벤트와 error 체크인이 생겼다.

### 변경 내용

- `CodeforcesError` 에 `type`(`NOT_FOUND` / `UNAVAILABLE` / `UNKNOWN`)과 `handle` 추가, 메시지에 HTTP 상태와 comment 원문.
- 요청 타임아웃 15초, 일괄 조회는 `UNAVAILABLE` 이면 2초·4초 뒤 재시도(최대 3번). 배지 단건 조회는 재시도 없음.
- 이름 변경 확인은 단건 `NOT_FOUND` 일 때만, `Location` 이 `/profile/<handle>` 일 때만 따라간다.
- 스케줄러는 `UNAVAILABLE` 이면 경고 로그 후 건너뛰고, 연속 30번의 배수마다 한 번 Sentry로 보고한다.
- Codeforces 조회를 DB 트랜잭션 밖으로 옮겼다.
- `BadgeController` 404 판단을 `e.type === 'NOT_FOUND'` 로 바꿨다.
- Jest `@/` 경로 매핑 추가.

### 파일

- `src/packages/codeforces/services/codeforces.service.ts`
- `src/packages/codeforces/services/codeforces.service.spec.ts`
- `src/schedular/services/scheduler.service.ts`
- `src/schedular/services/scheduler.service.spec.ts`
- `src/packages/badge/controllers/badge.controller.ts`
- `package.json` (jest `moduleNameMapper`)

### 검증

- `jest src/packages/codeforces/services/codeforces.service.spec.ts src/schedular/services/scheduler.service.spec.ts`: 22개 통과
- 변경 파일 범위 `tsc --noEmit`, `eslint` 통과

### 운영 메모

- 30분 미만 장애 동안 크론 모니터는 `ok` 로 찍힌다. 데이터는 그동안 갱신되지 않는다.
- 4xx 144건의 정확한 상태 코드는 Sentry에 남아 있지 않다. 이후 같은 응답이 오면 `UNAVAILABLE`(JSON이 아닌 본문) 또는 `UNKNOWN`(comment 원문 포함)으로 구분된다.
- 일괄 요청에 없어진 핸들이 섞이면 여전히 매분 `NOT_FOUND` 로 전체 갱신이 실패한다(최근 90일에는 없었다).
- 로컬 `main` 에만 있는 미푸시 커밋 `4f45b95 feat: harden codeforces sync pipeline` 이 같은 파일을 크게 바꾼다. 그 커밋을 올릴 때 이 변경과 충돌을 정리해야 한다.

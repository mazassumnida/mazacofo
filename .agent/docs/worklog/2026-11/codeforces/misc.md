# 2026-11 codeforces / misc 작업 로그

관련 canonical: `.agent/docs/current/codeforces/api-failure-handling.md`

## Sentry MAZACOFO-3 재점검과 일괄 조회의 없는 핸들 처리 (2026-11-06)

- 이슈: https://kodori.sentry.io/issues/MAZACOFO-3 (`CodeforcesError: Unknown error`, groupId 6759465633)
- 선행 작업: `.agent/docs/worklog/2026-10/codeforces/misc.md` (PR #5)

### 원인 판정

10-22 ~ 10-24 이벤트는 모두 **PR #5 배포 전 구버전 컨테이너**에서 났다. 원인은 PR #5 가 분석한 것과 같다.
Codeforces `user.info` 일괄 요청이 일시적으로 실패했고, 구버전 코드는 그 실패를 전부 `Unknown error` 로 바꿔 던졌다.
요청한 핸들이 없어서 난 실패가 아니고, 응답 형식이 바뀐 것도 아니다.

| 근거 | 값 |
|---|---|
| 최근 30일 이벤트 | 76건, 마지막 2026-10-24 23:00:00 UTC |
| 이벤트 태그 | `server_name` `bc40db233f26`, `node v22.12.0` (2026-07-22 기동, `33d73cf` 이미지) |
| 스택 | `updateCodeforcesData` 45행 → `getCodeforcesProfile` 62행 `throw new CodeforcesError('Unknown error')` (구버전 시그니처) |
| breadcrumb | `GET user.info?handles=<218개>` 가 `error` 또는 `info` 레벨(5xx/응답 없음 또는 200 비 JSON), 이어서 `HEAD /profile/<이어 붙인 핸들>` 403 |
| 배포 | `52ab019` 2026-10-25 16:51 UTC(Codeforces 코드는 구버전 그대로), PR #5 `b35fc13` 2026-10-28 01:41 UTC |
| 배포 후 | 10-25 이후 MAZACOFO-3 이벤트 0건. 크론 모니터 `update-codeforces-data` 일별 error 0 (10-22 21건 → 10-25부터 0) |

구버전 코드에서 "핸들 없음"은 `Profile not found` 로 따로 던졌으므로 `Unknown error` 이벤트에는 섞이지 않는다.

### 남아 있던 갭

PR #5 는 "일괄 요청에 없어진 핸들이 섞이면 매분 `NOT_FOUND` 로 전체 갱신이 실패한다" 를 남겨 뒀다.
Codeforces는 없는 핸들이 하나라도 있으면 결과를 하나도 주지 않으므로, 계정 하나가 삭제되거나 이름이 바뀌면
218명 전체의 레이팅 갱신이 멈추고 매분 Sentry error 가 생긴다. 예상 가능한 실패가 Sentry 노이즈와 전체 장애로 번지는 구조였다.

직접 호출로 확인한 Codeforces 동작(2026-11-06):

- `user.info?handles=tourist;<없는 핸들>;Petr` → HTTP 400 `{"status":"FAILED","comment":"handles: User with handle <없는 핸들> not found"}`
- 없는 핸들을 2개 넣어도 comment 에는 첫 번째 하나만 나온다.
- `HEAD /profile/tourist`, `HEAD /profile/<없는 핸들>` 모두 403 (로컬 네트워크 기준).

### 변경 내용

- `getBulkCodeforcesProfile` 반환을 `TCodeforcesBulkResult { profiles, renamedHandles, missingHandles }` 로 바꿨다.
  `NOT_FOUND` 가 오면 그 핸들만 빼고(이름 변경이면 새 핸들로 바꿔 넣고) 2초 뒤 나머지를 다시 요청한다.
- 한 실행에서 빠진 핸들이 5개(`MAX_MISSING_HANDLES_PER_RUN`)를 넘거나, 요청하지 않은 핸들을 없다고 하면 `UNKNOWN` 으로 던진다(진짜 이상 신호만 Sentry 로).
- 스케줄러는 저장 트랜잭션 안에서 이름 변경 행은 `handle` 을 바꾸고(새 핸들 행이 이미 있으면 옛 행 삭제), 없는 핸들 행은 지운다. warn 로그만 남긴다.
- 스케줄러 저장 시 프로필마다 `getClient` 를 부르던 것을 `getAllClients` 결과 Map(소문자 핸들) 조회로 바꿨다. Map 에 없는 프로필만 DB를 다시 본다.
- `ClientService` 에 `renameClient`, `removeClient` 추가.

### 파일

- `src/packages/codeforces/services/codeforces.service.ts`
- `src/packages/codeforces/services/codeforces.service.spec.ts`
- `src/schedular/services/scheduler.service.ts`
- `src/schedular/services/scheduler.service.spec.ts`
- `src/packages/client/services/client.service.ts`

### 회귀 테스트

- 서비스: 없는 핸들을 빼고 나머지 재요청, 재요청 전 2초 대기, 대소문자 무시 매칭, 여러 개를 하나씩 제거, 이름 변경 치환, 이미 목록에 있는 새 핸들 중복 방지,
  전부 없음, 제거 후 재요청의 `UNAVAILABLE` 재시도, 5개 초과 시 `UNKNOWN`, 요청하지 않은 핸들 `UNKNOWN`.
- 스케줄러: Map 기반 update, 대소문자 무시, Map 에 없는 프로필의 DB 조회 후 insert, 없는 핸들 행 삭제(실패 없이 커밋), 남은 핸들이 없어도 삭제 커밋,
  이름 변경 후 새 핸들 프로필로 같은 행 update, 새 핸들 행이 이미 있으면 옛 행 삭제.

### 운영 메모

- MAZACOFO-3 은 PR #5 배포 뒤 재발하지 않았다. 새 코드의 오류 메시지와 스택이 달라 같은 이슈로 묶이지 않으므로 Sentry 에서 resolve 해도 된다.
- 크론 모니터에 하루 1~6건 `timeout` 체크인(maxRuntime 3분 초과)이 PR #5 배포 전후로 계속 있다. 이 작업 범위 밖이다.
- 로컬 `main` 은 `origin/main` 과 갈라져 있다(로컬에만 `4f45b95`, `2636faf`, `d03e1e6`). 이 작업은 `origin/main`(`b35fc13`) 기준이다.

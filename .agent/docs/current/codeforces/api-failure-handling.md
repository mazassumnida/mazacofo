# Codeforces API 실패 처리

관련 코드: `src/packages/codeforces/services/codeforces.service.ts`, `src/schedular/services/scheduler.service.ts`

## 실패 분류 (`CodeforcesError.type`)

| type | 조건 | 처리 |
|---|---|---|
| `NOT_FOUND` | API comment가 `handles: User with handle X not found` (HTTP 400) | `handle` 에 없는 핸들을 담는다. 재시도하지 않는다 |
| `UNAVAILABLE` | 응답 없음(타임아웃·연결 끊김·DNS), 5xx, 429, comment `Call limit exceeded`, JSON API 응답이 아닌 본문(HTML 차단·점검 페이지, HTTP 200 포함) | 일시 장애로 본다 |
| `UNKNOWN` | 그 밖의 API 실패, axios 밖의 예외 | 메시지에 HTTP 상태와 comment 원문을 남기고 error 로그 |

## 요청 규칙

- 모든 요청 타임아웃 15초.
- 크론 일괄 조회(`getBulkCodeforcesProfile`): 모든 핸들을 `;`로 이어 `user.info` 한 번에 요청한다.
  `UNAVAILABLE` 이면 2초, 4초 뒤 재시도해 최대 3번 시도한다. Codeforces 권장 간격(2초에 1번)을 지키며 최악 51초 안에 끝난다.
- 배지 단건 조회(`getCodeforcesProfile`): 응답 지연을 늘리지 않도록 재시도하지 않는다.
- 이름 변경 확인: 단건 `NOT_FOUND` 일 때만 `HEAD /profile/<handle>` 을 보내고,
  302 `Location` 이 `/profile/<새 핸들>` 형태일 때만 새 핸들로 다시 조회한다.
  이어 붙인 핸들 문자열로는 HEAD를 보내지 않는다(항상 403).

## 크론(`update-codeforces-data`) 규칙

- Codeforces 조회는 DB 트랜잭션 밖에서 하고, 저장할 때만 트랜잭션을 연다.
- `UNAVAILABLE`: 경고 로그만 남기고 그 분의 실행을 건너뛴다. 예외를 던지지 않으므로 Sentry 이벤트가 생기지 않고 크론 체크인은 `ok` 다.
- 연속 `UNAVAILABLE` 이 30번(약 30분)의 배수가 될 때마다 `Codeforces API has been unavailable for N consecutive runs: ...` 예외를 던져 Sentry에 남긴다.
  성공하거나 다른 종류의 실패가 오면 카운터를 0으로 되돌린다. 카운터는 프로세스 메모리에만 있다.
- `NOT_FOUND`, `UNKNOWN`: 즉시 다시 던진다(`@SentryCron` 이 error로 보고).
  일괄 요청에 없어진 핸들이 하나라도 있으면 그 분의 전체 갱신이 실패한다.

## 배지 응답

- `NOT_FOUND` → 404 `<svg>Codeforces profile not found</svg>`
- 그 밖의 실패 → 500 `<svg>Internal server error</svg>`

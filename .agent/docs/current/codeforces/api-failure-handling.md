# Codeforces API 실패 처리

관련 코드: `src/packages/codeforces/services/codeforces.service.ts`, `src/schedular/services/scheduler.service.ts`, `src/packages/client/services/client.service.ts`

## 실패 분류 (`CodeforcesError.type`)

| type | 조건 | 처리 |
|---|---|---|
| `NOT_FOUND` | API comment가 `handles: User with handle X not found` (HTTP 400) | `handle` 에 없는 핸들을 담는다. 재시도하지 않는다. 일괄 조회에서는 밖으로 던지지 않는다(아래) |
| `UNAVAILABLE` | 응답 없음(타임아웃·연결 끊김·DNS), 5xx, 429, comment `Call limit exceeded`, JSON API 응답이 아닌 본문(HTML 차단·점검 페이지, HTTP 200 포함) | 일시 장애로 본다 |
| `UNKNOWN` | 그 밖의 API 실패, axios 밖의 예외, 일괄 조회의 비정상 `NOT_FOUND`(아래) | 메시지에 HTTP 상태와 comment 원문을 남기고 error 로그 |

## 요청 규칙

- 모든 요청 타임아웃 15초.
- 크론 일괄 조회(`getBulkCodeforcesProfile`): 모든 핸들을 `;`로 이어 `user.info` 한 번에 요청한다.
  `UNAVAILABLE` 이면 2초, 4초 뒤 재시도해 최대 3번 시도한다. Codeforces 권장 간격(2초에 1번)을 지키며 최악 51초 안에 끝난다.
- 배지 단건 조회(`getCodeforcesProfile`): 응답 지연을 늘리지 않도록 재시도하지 않는다.
- 이름 변경 확인: `NOT_FOUND` 로 지목된 핸들 하나에만 `HEAD /profile/<handle>` 을 보내고,
  302 `Location` 이 `/profile/<새 핸들>` 형태일 때만 새 핸들로 본다.
  이어 붙인 핸들 문자열로는 HEAD를 보내지 않는다(항상 403).
  2026-11-06 기준 로컬에서 `HEAD /profile/<있는 핸들>`, `HEAD /profile/<없는 핸들>` 모두 403 이었다. 서버에서도 403이면 이름 변경은 "없는 핸들"로 처리된다.

## 일괄 조회의 없는 핸들 (`NOT_FOUND`)

Codeforces는 요청한 핸들 중 없는 것이 있으면 결과를 하나도 주지 않고 HTTP 400 + `handles: User with handle X not found` 로
**첫 번째 없는 핸들 하나만** 알려준다(2026-11-06 직접 호출로 확인, 없는 핸들 2개를 넣어도 1개만 나온다).

`getBulkCodeforcesProfile` 은 이를 실패로 던지지 않고 다음처럼 처리해 `TCodeforcesBulkResult` 를 돌려준다.

1. comment 의 핸들을 요청 목록에서 대소문자 무시로 찾아 뺀다.
2. 그 핸들 하나로 이름 변경을 확인한다. 새 핸들이 있으면 `renamedHandles` 에 `{ from, to }` 를 넣고 새 핸들을 목록에 넣는다(이미 있으면 넣지 않는다). 없으면 `missingHandles` 에 넣는다.
3. 남은 핸들이 있으면 2초 쉬고 다시 요청한다. 다시 요청할 때도 `UNAVAILABLE` 재시도 규칙은 그대로다.
4. 모두 빠지면 요청 없이 빈 `profiles` 를 돌려준다.

비정상 신호는 Sentry에 남도록 `UNKNOWN` 으로 던진다.

- 한 실행에서 빠진 핸들이 `MAX_MISSING_HANDLES_PER_RUN`(5개)을 넘을 때: `Codeforces reported more than 5 missing handles in one run (...)`.
  API 의미가 바뀌거나 Codeforces가 멀쩡한 핸들을 없다고 하는 상황에서 DB 행이 대량 삭제되지 않게 하는 안전장치다. 이 경우 DB는 바꾸지 않는다.
- comment 의 핸들이 요청 목록에 없을 때: `Codeforces reported a handle that was not requested as missing: ...`.

## 크론(`update-codeforces-data`) 규칙

- Codeforces 조회는 DB 트랜잭션 밖에서 하고, 저장할 때만 트랜잭션을 연다.
- 저장은 `getAllClients` 로 읽은 행을 핸들(소문자) 기준 Map 으로 찾는다. Map 에 없는 프로필만 `getClient` 로 DB를 한 번 더 보고, 그래도 없으면 insert 한다.
- 저장 트랜잭션 안에서 순서대로:
  1. `renamedHandles`: 옛 핸들 행의 `handle` 을 새 핸들로 바꾼다(`renameClient`). 새 핸들 행이 이미 있으면 옛 행을 지운다(`removeClient`).
  2. `missingHandles`: 그 행을 지운다(`removeClient`). `clients` 는 Codeforces 프로필 캐시라, 나중에 그 핸들로 배지 요청이 오면 `getOrCreateClient` 가 다시 조회해 404 또는 새 행이 된다.
  3. `profiles`: update 또는 insert.
- 이름 변경·삭제는 Sentry 이벤트 없이 warn 로그(`Renamed N clients (...)`, `Removed N clients missing on Codeforces (...)`)만 남긴다. 다음 실행부터는 그 핸들을 요청하지 않는다.
- `UNAVAILABLE`: 경고 로그만 남기고 그 분의 실행을 건너뛴다. 예외를 던지지 않으므로 Sentry 이벤트가 생기지 않고 크론 체크인은 `ok` 다.
- 연속 `UNAVAILABLE` 이 30번(약 30분)의 배수가 될 때마다 `Codeforces API has been unavailable for N consecutive runs: ...` 예외를 던져 Sentry에 남긴다.
  성공하거나 다른 종류의 실패가 오면 카운터를 0으로 되돌린다. 카운터는 프로세스 메모리에만 있다.
- `UNKNOWN`: 즉시 다시 던진다(`@SentryCron` 이 error로 보고).

## 배지 응답

- `NOT_FOUND` → 404 `<svg>Codeforces profile not found</svg>`
- 그 밖의 실패 → 500 `<svg>Internal server error</svg>`

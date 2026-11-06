# Codeforces API 실패 처리

관련 코드: `src/codeforces.ts`, `src/badge.ts`, `src/profile-store.ts`
전체 흐름: `.agent/docs/current/architecture/worker-d1.md`

## 실패 분류 (`CodeforcesError.type`)

| type          | 조건                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NOT_FOUND`   | API comment 가 `handles: User with handle X not found`, 그리고 `HEAD /profile/<handle>` 이 다른 핸들로 302 하지 않음                             |
| `UNAVAILABLE` | 응답 없음(타임아웃 10초·네트워크 오류), 5xx, 429, comment `Call limit exceeded`, JSON API 응답이 아닌 본문(HTML 차단·점검 페이지, HTTP 200 포함) |
| `UNKNOWN`     | 그 밖의 API 실패, `OK` 인데 결과가 1개 프로필이 아님                                                                                             |

## 요청 규칙

- 뱃지 요청 하나당 `user.info?handles=<handle>` 단건 요청. 재시도하지 않는다(실패는 D1 백오프로 처리).
- 이름 변경: `NOT_FOUND` 일 때만 `HEAD /profile/<handle>` (`redirect: manual`). 302 `Location` 이 `/profile/<새 핸들>` 이고 대소문자 무시로 다른 핸들이면 새 핸들로 한 번 더 조회한다. 한 단계만 따라간다.

## 처리

| 상황                       | `NOT_FOUND`           | `UNAVAILABLE`                                      | `UNKNOWN`                    |
| -------------------------- | --------------------- | -------------------------------------------------- | ---------------------------- |
| 캐시 없음(첫 요청)         | `not_found` 저장, 404 | 503 `max-age=60`, 저장 안 함                       | 503, Sentry                  |
| 캐시 있음(백그라운드 갱신) | `not_found` 로 전환   | 예전 값 유지, 백오프, 5번째 연속 실패에 Sentry 1회 | 예전 값 유지, 백오프, Sentry |

백오프: `min(15분 × 2^(n-1), 6시간)` (n = 연속 실패 횟수). 성공하면 0 으로 되돌린다.

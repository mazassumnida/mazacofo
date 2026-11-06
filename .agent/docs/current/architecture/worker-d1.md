# 아키텍처: Cloudflare Worker + D1

2026-11-06 NestJS 서버(EC2 Docker + MySQL + 매분 cron 일괄 동기화)를 Worker 하나로 바꿨다.

## 구성

| 파일                         | 역할                                                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/index.ts`               | Worker 진입점. `withSentry` 로 감싸고 실제 `fetch`, `Date.now`, `ctx.waitUntil` 을 `BadgeDeps` 로 넘긴다 |
| `src/badge.ts`               | 요청 검증, 캐시 조회, 백그라운드 갱신, 응답                                                              |
| `src/codeforces.ts`          | `user.info` 단건 조회, 이름 변경 확인(`HEAD /profile/<handle>` 302), 실패 분류                           |
| `src/profile-store.ts`       | D1 `profiles` 테이블 읽기/쓰기, 갱신 선점, 실패 백오프                                                   |
| `src/svg.ts`, `src/ranks.ts` | 뱃지 SVG (기존 디자인 그대로)                                                                            |
| `migrations/`                | D1 마이그레이션 (`wrangler d1 migrations apply DB`)                                                      |

- 라우트: `cf.leed.at/*` (zone `leed.at`). 기존 프록시 DNS 레코드를 그대로 두고 Worker 라우트가 가로챈다. `workers_dev` 는 끈다.
- D1: `mazacofo` (`ec252796-6d2a-4008-a26a-f41e0fbe02c2`, APAC).
- Sentry: `MAZA_ENV === 'production'` 일 때만 켠다. DSN 은 `wrangler.jsonc` vars.

## 요청 흐름 (stale-while-revalidate)

1. `id` 를 `^[A-Za-z0-9_-]+$` 로 검증. 키는 소문자 핸들.
2. D1 에 행이 없으면 Codeforces 를 바로 호출한다.
   - 성공: `found` 저장 후 뱃지.
   - `NOT_FOUND`: `not_found` 저장 후 404.
   - `UNAVAILABLE`/`UNKNOWN`: 저장하지 않고 503 (`max-age=60`). `UNKNOWN` 은 Sentry.
3. 행이 있으면 저장된 값으로 바로 응답한다. `refresh_at` 이 지났으면 `waitUntil` 로 백그라운드 갱신.
4. 백그라운드 갱신은 `UPDATE ... WHERE refresh_at <= now` 로 60초 선점(lease)을 잡은 요청 하나만 한다.
   - 성공: 값 갱신, `refresh_at = now + 1h`, `failure_count = 0`.
   - `NOT_FOUND`: `not_found` 로 바꾼다(계정 삭제). 1시간 뒤 다시 확인.
   - 그 밖의 실패: 값은 그대로 두고 `failure_count + 1`, `refresh_at = now + min(15분 × 2^(n-1), 6시간)`.
     `UNKNOWN` 은 즉시, `UNAVAILABLE` 은 연속 5번째 실패에서 한 번 Sentry 로 보낸다(fingerprint `codeforces-unavailable` 로 한 이슈에 묶음).

조회되지 않는 핸들은 갱신하지 않는다. cron 이 없다.

## 이전 구조와 달라진 점

- 일괄 `user.info` 요청이 없어서 "없는 핸들 하나 때문에 전체 갱신 실패", "5개 초과 시 중단" 같은 일괄 조회 전용 규칙이 사라졌다.
- 이름이 바뀐 핸들은 요청한 핸들 키 아래에 새 핸들의 프로필을 저장한다(행 이동·삭제 없음).
- 핸들은 대소문자 무시로 한 행을 쓴다.
- 기존 응답 문자열(`<svg>...</svg>`), `Cache-Control: public, max-age=3600`, CORS `*`, `mini` 가 비어 있지 않으면 미니 뱃지라는 동작은 유지했다.
- 새로 생긴 응답: Codeforces 장애 + 캐시 없음 → 503 `<svg>Codeforces is temporarily unavailable</svg>`. 알 수 없는 rank → 404 `rating not available` (이전엔 500).

## 운영

- 배포: `release` 브랜치 push → `.github/workflows/deploy.yml` (typecheck, lint, test 후 `yarn deploy`). 저장소 시크릿 `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` 필요.
- 로컬: `yarn dev` (`MAZA_ENV=development` 로 띄워 Sentry 를 끈다).
- 테스트: `@cloudflare/vitest-plugin` 으로 workerd 안에서 로컬 D1 에 마이그레이션을 적용해 돈다. Codeforces 는 가짜 fetcher 로 대체.
- 기존 MySQL 데이터는 이관하지 않았다. 첫 조회 때 Codeforces 에서 다시 채운다.

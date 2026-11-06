# 2026-11 ops / misc 작업 로그

## NestJS 서버를 Cloudflare Worker + D1 로 전환 (2026-11-06)

canonical: `.agent/docs/current/architecture/worker-d1.md`

### 왜

- 캐시의 실제 가치는 지연시간보다 장애 내성이었다. MAZACOFO-9E(Codeforces 전역 차단) 때 DB 에 있던 핸들은 예전 값으로 계속 뱃지가 나갔다.
  그래서 "바로 API 호출"이 아니라 "캐시는 유지하고 서버만 없앤다"로 정했다.
- 매분 cron 으로 218개 핸들을 일괄 갱신하던 구조가 장애 대부분(일괄 요청 실패 전파, 없는 핸들 하나로 전체 실패, cron timeout)의 원인이었다.
  조회 시 갱신(stale-while-revalidate)으로 바꾸면 이 규칙들이 통째로 필요 없다.
- EC2 + Docker + ECR + MySQL + SSH 배포를 관리할 필요가 없어진다. D1·Workers 무료 한도 안이다.

### 한 일

- `src/` 를 Worker 로 새로 작성(NestJS, MikroORM, axios, Docker, `maza` 스크립트 제거).
- D1 `mazacofo` 생성, `migrations/0001_create_profiles.sql`.
- SVG 는 기존 디자인을 그대로 옮겼다. 운영 서버 출력과 나란히 렌더해 동일함을 확인(tourist, jiangly, Benq, mini, Expert).
- 테스트 33개(Codeforces 분류 13, 뱃지/캐시/백오프/선점 20).
- 실제 Codeforces 로 로컬 workerd 스모크: 첫 조회 0.5~0.7초, 캐시 히트 1ms, 없는 핸들 404.
- CI(`ci.yml`) 추가, 배포 워크플로를 `wrangler deploy` 로 교체.

### 운영 전환 (2026-11-06)

- 로컬 `yarn deploy` 로 배포했다(wrangler OAuth). D1 마이그레이션 `0001_create_profiles.sql` 적용, Worker version `ccdd3f0e-7606-4249-8ef2-dfa1206929fc`, 라우트 `cf.leed.at/*`.
- 기존 MySQL 데이터는 옮기지 않았다(사용자 결정). 첫 조회 때 Codeforces 에서 채운다.
- 확인: tourist/Benq/jiangly(mini) 200, 없는 핸들 404, 잘못된 id 400, `Content-Type`·`Cache-Control`·CORS 헤더 유지. 배포 직후 실사용자 요청(`vulpo`)이 D1 에 저장됐다.
- 지연: 한국에서 `cf.leed.at` TTFB 0.8~1.8초. `colo=LAX` 로 라우팅되는 존 단위 현상이라 Worker 와 무관하다(같은 존 정적 사이트 `leed.at/` 0.6~1.2초, D1 을 안 타는 400 응답도 0.8초). GitHub camo 는 미국에서 가져가므로 실제 README 로딩에는 영향이 작다.

### EC2 컨테이너 정지 (2026-11-06)

- `dongzoolee-production` 의 `mazacofo` 컨테이너(이미지 `b35fc13`)를 `docker update --restart=no` 후 `docker stop`. 재부팅해도 다시 뜨지 않는다.
- 컨테이너·이미지는 지우지 않았다. 롤백: Cloudflare 에서 `cf.leed.at/*` Worker 라우트 삭제 후 `docker update --restart=always mazacofo && docker start mazacofo`.
- 정지 후 `cf.leed.at` 응답 재확인: 캐시된 핸들·새 핸들 200, 없는 핸들 404.

### 레거시 흔적 전부 삭제 (2026-11-06)

- 서버(`dongzoolee-production`): MySQL `mazacofo` DB 삭제(387행, 백업 없음), `mazacofo` 컨테이너·이미지 삭제, nginx `conf.d/cf-leed.conf`(`cf.leed.at` → `localhost:2021`) 삭제 후 reload.
- AWS: ECR `mazacofo` 저장소(이미지 9개) 삭제.
- GitHub: `SENTRY_AUTH_TOKEN` 시크릿(그 전에 사용자가 AWS·MySQL·SSH 시크릿 정리), 머지된 원격 브랜치 3개 삭제.
- 로컬: 예전 워크트리(`.claude/worktrees/fix-codeforces-profile-error-d9c582`, 미커밋 변경 포함), 예전 로컬 브랜치·백업 브랜치, `.env`, `.env.op` 삭제. 스크립트의 `.env` 무시 설정 제거.
- 롤백 경로는 더 이상 없다. 문제가 생기면 Worker 를 고친다.

남은 것(권한 부족으로 직접 못 함):

- MySQL 계정 `mazacofo@172.20.0.%`: DB 는 지웠지만 계정 삭제(`DROP USER`)는 root 권한이 필요하다. 컨테이너 env 의 `MYSQL_ROOT_PASSWORD` 는 실제 비밀번호와 다르다.
- Sentry 크론 모니터 `update-codeforces-data`(id 6643519): 매분 missed check-in 으로 실패 이슈를 만든다. 1Password 의 Sentry 토큰은 sourcemap 전용이라 API 삭제가 403.
- 1Password `dev-env` 의 `mazacofo.env`, `mazacofo.env (원본 2026-10-28)` 항목.
- Cloudflare DNS `cf.leed.at` 프록시 레코드는 아직 옛 서버 IP 를 가리킨다. Worker 라우트가 가로채므로 동작에는 문제없다. origin 노출을 없애려면 `AAAA 100::`(프록시)로 바꾸면 된다.

### 참고

- 로컬 `main` 은 `origin/main` 과 갈라져 있다(로컬에만 `4f45b95`, `2636faf`, `d03e1e6`). 이 작업은 `origin/main`(`19ba307`) 기준이다.

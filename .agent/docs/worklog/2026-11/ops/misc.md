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

### 남은 일 (전환)

1. GitHub 저장소 시크릿 `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` 등록.
2. (선택) MySQL 데이터 이관: `scripts/export-legacy-clients.sql`.
3. `release` 로 배포 → `cf.leed.at/*` 라우트가 EC2 대신 Worker 로 간다. 롤백은 Cloudflare 대시보드에서 라우트 삭제.
4. 확인 후 EC2 `mazacofo` 컨테이너, ECR 저장소, MySQL `mazacofo` DB 정리.

### 참고

- 로컬 `main` 은 `origin/main` 과 갈라져 있다(로컬에만 `4f45b95`, `2636faf`, `d03e1e6`). 이 작업은 `origin/main`(`19ba307`) 기준이다.

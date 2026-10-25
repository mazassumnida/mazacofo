# ops 작업 로그 (2026-10)

## Node 22.12 고정 해제 (2026-10-25)

Node.js 2026-10-21 보안 릴리스(22.23.4)를 받으려고 `Dockerfile` 세 스테이지의 `node:22.12-alpine` 을 `node:22-alpine` 으로 바꿨다.

- `node:22.12-alpine` 태그는 2025-01-07 이후 갱신되지 않는다. 다시 빌드해도 22.12.0 그대로라 그 뒤 22.x 보안 패치를 하나도 받지 못한다.
  ECR `mazacofo` 최신 이미지(2025-07-20 빌드)의 `NODE_VERSION` 도 22.12.0 이었다.
- 서버는 Nest 10 + Express 4(body-parser 1.x)라 `Content-Encoding: br` 요청 본문은 415 로 거절된다. 이번 릴리스의 Brotli 원격 코드 실행
  (CVE-2026-111497)에 요청 본문으로 닿는 경로는 없지만, TLS 호스트 검증 우회·keep-alive 응답 혼입과 번들 OpenSSL·undici·CA 인증서 갱신은 그대로 해당된다.
- 메이저(22)만 고정하면 이미지를 새로 빌드할 때마다 최신 22.x 패치가 들어온다. 22 는 2027-04 에 지원이 끝난다.
- 배포는 이 PR 머지 후 `release` push 로 `deploy.yml` 이 이미지를 새로 빌드한다.

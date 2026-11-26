# 패키지 매니저: pnpm 10 (hoisted)

2026-11-26 yarn 1.22.22에서 pnpm 10.34.9로 옮겼다. 워크트리마다 `node_modules` 실복사본이 생겨 디스크를 먹던 문제를 없애려는 것이다. admob-widget `5da9969`·`3187b5a`, the-vine `7eeb76b30`과 같은 설정이다.

## 설정

- `package.json` `packageManager`: `pnpm@10.34.9+sha512.…`(corepack이 이 버전을 쓴다)
- `pnpm-workspace.yaml`
  - `nodeLinker: hoisted`: yarn v1과 같은 평평한 `node_modules`. wrangler·vitest pool·eslint가 보던 경로가 그대로다.
  - `autoInstallPeers: false`: yarn v1처럼 peer를 자동 설치하지 않아 의존 트리가 바뀌지 않는다.
  - `packageImportMethod: clone-or-copy`: macOS APFS에서 스토어(`~/Library/pnpm/store`)의 파일을 clonefile로 가져온다. 워크트리끼리 디스크 블록을 공유해 새 워크트리 설치가 디스크를 거의 쓰지 않는다.
  - `onlyBuiltDependencies`: 설치 스크립트를 돌릴 패키지 허용 목록(아래 "빌드 스크립트").
- lock: `pnpm-lock.yaml`. `pnpm import`로 기존 `yarn.lock`에서 만들었다(버전 그대로: wrangler 4.158.0, vitest 5.1.0, @cloudflare/vitest-plugin 1.6.0, vite 8.3.6, typescript 6.0.3, eslint 10.14.0, @sentry/cloudflare 11.11.0). `yarn.lock`은 지웠다.
- `.prettierignore`에 `pnpm-lock.yaml`을 넣어 `pnpm format`이 lock을 건드리지 않게 했다.

## 명령

| 예전                                                      | 지금                                                      |
| --------------------------------------------------------- | --------------------------------------------------------- |
| `yarn` / `yarn install --frozen-lockfile`                 | `pnpm install` / `pnpm install --frozen-lockfile`         |
| `yarn add <pkg>`                                          | `pnpm add <pkg>` (`-D`는 devDependencies)                 |
| `yarn dev` / `yarn typecheck` / `yarn lint` / `yarn test` | `pnpm dev` / `pnpm typecheck` / `pnpm lint` / `pnpm test` |
| `yarn typegen` / `yarn format`                            | `pnpm typegen` / `pnpm format`                            |
| `yarn deploy`                                             | `pnpm run deploy`                                         |

- `deploy`는 반드시 `pnpm run deploy`로 부른다. `pnpm deploy`는 pnpm 자체 명령(워크스페이스 패키지 내보내기)이라 스크립트가 돌지 않는다. `deploy.yml`도 `pnpm run deploy`다.
- 패키지를 추가·변경한 뒤에는 `pnpm-lock.yaml`을 함께 커밋한다. CI는 `--frozen-lockfile`이라 lock이 안 맞으면 실패한다.
- `pnpm` 명령이 없으면 `corepack enable`.
- 기존 체크아웃은 머지 후 `rm -rf node_modules && pnpm install`.

## 빌드 스크립트

pnpm 10은 허용 목록에 없는 의존성의 install 스크립트를 건너뛴다. 설치 출력에 "Ignored build scripts"가 나오면 그 패키지가 실제로 필요로 하는지 보고 `onlyBuiltDependencies`(필요) 또는 `ignoredBuiltDependencies`(불필요)에 넣는다.

- 허용: `esbuild`(wrangler 번들링), `workerd`(wrangler dev·vitest pool이 쓰는 로컬 런타임 바이너리 확인). 처음 설치에서 무시된 건 이 둘뿐이었다.

## CI

`ci.yml`(PR·main 푸시)과 `deploy.yml`(`release` 푸시) 모두: `actions/setup-node@v4`(node 22, 캐시 없음) → `corepack enable` + `$GITHUB_ENV`에 `COREPACK_ENABLE_DOWNLOAD_PROMPT=0` → `actions/setup-node@v4`(`cache: pnpm`, `cache-dependency-path: pnpm-lock.yaml`, pnpm이 PATH에 있어야 캐시 경로를 찾는다) → `pnpm install --frozen-lockfile` → `pnpm typecheck` → `pnpm lint` → `pnpm test`(→ deploy.yml만 `pnpm run deploy`). `pnpm/action-setup`은 the-vine 러너에서 `ERR_INVALID_ARG_TYPE`로 죽어서 쓰지 않는다. `runs-on`은 그대로 `ubuntu-latest`.

## 검증 (2026-11-26)

- `pnpm import` → `pnpm install --frozen-lockfile`: 173개 패키지. 무시된 빌드 스크립트 `esbuild`·`workerd`를 허용한 뒤 `pnpm ignored-builds`는 None.
- `node_modules`를 지우고 스토어에서 다시 설치(`--offline`): 13.3초, workerd postinstall 통과.
- `pnpm typecheck` 0, `pnpm lint` 0, `prettier --check`(바꾼 파일) 통과.
- `pnpm exec wrangler deploy --dry-run --outdir <임시>`: 번들 497.95 KiB(gzip 116.42 KiB), 바인딩 DB(D1 mazacofo)·MAZA_ENV·SENTRY_DSN 인식. 임시 폴더는 지웠다.
- `pnpm typegen`: 같은 해시로 생성됐고 차이는 들여쓰기뿐이라 되돌렸다.
- vitest(`pnpm test`)는 CI가 돌린다. 실제 배포는 하지 않았다.
- `node_modules` 겉보기 521MB, 스토어와 공유하지 않는 APFS 블록 0MB.

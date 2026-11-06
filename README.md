# Mazacofo

Codeforces rating badge generator for Github Readme

## Features

### Automatic Updates

Badges are served by a Cloudflare Worker backed by D1. A profile is fetched from Codeforces the first time it is requested and refreshed in the background once it is older than an hour. If Codeforces is down, the last known rating keeps being served.

### Badge Styles

- **Regular**: Full-size badge with detailed information
- **Mini**: Compact badge showing only rating
- **Legendary Grandmaster**: Special styling for top-tier users

## Usage

```markdown
[![CodeForces Profile](https://cf.leed.at?id={your handle})](https://codeforces.com/profile/{your handle})
```

See [#api-endpoints](#api-endpoints) for more options.

## Screenshots

#### Newbie

<img src="https://i.ibb.co/Wyhz924/newbie.png" alt="newbie" border="0" width="400px">

#### Pupil

<img src="https://i.ibb.co/xCLW8Lk/pupil.png" alt="pupil" border="0" width="400px">

#### Specialist

<img src="https://i.ibb.co/z2Lssmx/specialist.png" alt="specialist" border="0" width="400px">

#### Expert

<img src="https://i.ibb.co/Xp0L42G/expert.png" alt="expert" border="0" width="400px">

#### Candidate Master

<img src="https://i.ibb.co/r06CrhM/cmaster.png" alt="cmaster" border="0" width="400px">

#### Master & International Master

<img src="https://i.ibb.co/pzdmQmz/master.png" alt="master" border="0" width="400px">
<img src="https://i.ibb.co/KxB67Sp/imaster.png" alt="imaster" border="0" width="400px">

#### Grandmaster & International GrandMaster

<img src="https://i.ibb.co/VCJXZZd/gmaster.png" alt="gmaster" border="0" width="400px">
<img src="https://i.ibb.co/SmGZhZw/igmaster.png" alt="igmaster" border="0" width="400px">

#### Legendary Grandmaster

<img src="https://i.ibb.co/dr8bb2T/lgmaster.png" alt="lgmaster" border="0" width="400px">

## Development

Requires Node.js 22 and Yarn 1.

```bash
yarn
yarn dev
```

Other scripts:

| Script           | Purpose                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| `yarn test`      | Run the Vitest suite inside the Workers runtime with a local D1        |
| `yarn typecheck` | TypeScript check                                                       |
| `yarn lint`      | ESLint                                                                 |
| `yarn typegen`   | Regenerate `worker-configuration.d.ts` after changing `wrangler.jsonc` |
| `yarn deploy`    | Apply D1 migrations and deploy the Worker                              |

Pushing to the `release` branch deploys through GitHub Actions. The workflow needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.

### API Endpoints

```
GET /?id={handle}&mini=1
```

Parameters:

- `id`: Codeforces handle (required)
- `mini`: Any non-empty value shows the mini badge (optional)

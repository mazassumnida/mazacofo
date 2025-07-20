# Mazacofo

Codeforces rating badge generator for Github Readme

## Features

### Automatic Updates

The application automatically updates Codeforces data every minute using a cron task.

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

1. Clone the repository:

```bash
git clone <repository-url>
cd mazacofo
```

2. Install dependencies:

```bash
yarn
```

3. Create a `.env` file with your database configuration:

```env
PORT=2021

MAZA_ENV=development

MYSQL_HOST=localhost
MYSQL_USER=your_username
MYSQL_PW=your_password
MYSQL_DB=mazacofo
```

4. Set up the database:

```bash
# Create the database
mysql -u your_username -p -e "CREATE DATABASE mazacofo;"

# Run migrations (if needed)
npm run migration:run
```

5. Run development server

```bash
./maza run server
```

### API Endpoints

```
GET /?id={handle}&mini={true|false}
```

Parameters:

- `id`: Codeforces handle (required)
- `mini`: Show mini badge (optional)

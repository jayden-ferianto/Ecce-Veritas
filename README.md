# Ecce Veritas

A personal habit tracker built with SvelteKit, TypeScript, Tailwind CSS, Lucide icons, SQLite, and Node.js. Data is stored in a persistent SQLite database.

## Run with Docker Compose

On Ubuntu 24.04 with Docker Compose installed:

```sh
git clone https://github.com/jayden-ferianto/ecce-veritas.git
cd ecce-veritas
cp .env.example .env
nano .env
docker compose up -d --build
```

Before starting, set a unique password of at least 16 characters and a separate random `APP_SECRET` in `.env`; generate the secret with `openssl rand -hex 32`. Keep `.env` private; it is excluded from Git. Set `TZ` to your server's IANA timezone (for example, `Asia/Singapore`) so daily check-ins reset at local midnight.

Production cookies are secure by default and require HTTPS. For CasaOS, put the app behind an HTTPS reverse proxy and set `ORIGIN` in `.env` to the exact public URL (for example, `https://habits.example.com`). For direct HTTP access on a trusted private LAN only, set `AUTH_COOKIE_SECURE=false` and use `http://<server-ip>:3000`; never expose that HTTP setup to the internet. This app uses one shared password rather than separate user accounts.

The `habit-data` volume keeps your database when the container is rebuilt or upgraded. To back up the database, stop the app and copy the `habits.db` file from the Docker volume.

## Publish and update the server

Create a GitHub repository named `ecce-veritas` (an empty repository is easiest). In PowerShell, from this project folder, publish the code:

```powershell
git init
git add .
git commit -m "Initial Ecce Veritas app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/ecce-veritas.git
git push -u origin main
```

Clone it onto the Ubuntu server once, configure the password and secret as described above, then start the app:

```sh
git clone https://github.com/YOUR-USERNAME/ecce-veritas.git
cd ecce-veritas
cp .env.example .env
nano .env
docker compose up -d --build
```

Do not copy `.env` into GitHub.

For each later change, publish it from Windows:

```powershell
git add .
git commit -m "Describe your change"
git push
```

For the first update that adds authentication to an already-running server, pull the code first so `.env.example` is available:

```sh
git pull --ff-only
```

If the server does not already have a `.env` file, create one and edit it. If it does, keep it and add the required settings:

```sh
# Run this only if .env does not already exist:
cp .env.example .env
# Then edit the existing .env:
nano .env
```

Set `APP_PASSWORD`, `APP_SECRET`, and the appropriate `AUTH_COOKIE_SECURE`/`ORIGIN` values in `.env`, then rebuild:

```sh
docker compose up -d --build
```

Keep `.env` unchanged on later updates so your password and sessions remain stable. For subsequent changes:

```sh
git pull --ff-only
docker compose up -d --build
```

Rebuilding this Compose app keeps the `habit-data` volume. Do not run `docker compose down -v` when updating; `-v` removes the database volume. Keep the server project folder and Compose project name unchanged so Compose continues using the same volume.

## Local development

Requires Node.js 22 or newer.

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env` and set a password of at least 16 characters and a random `APP_SECRET` before running locally. The local database is created at `data/habits.db`. Set `DATABASE_PATH` to use another location. Set `TZ` to configure the local day boundary if your machine's timezone is not the one you want to use.

## Features

- Daily habits that can be checked off once per day.
- Counted habits with configurable daily targets and increment/decrement controls.
- Optional descriptions and per-day notes, daily overview progress, dated monthly history, 30-day history, streaks, and individual habit status pages.

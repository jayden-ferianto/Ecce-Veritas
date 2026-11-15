# Ecce Veritas

A personal habit tracker built with SvelteKit, TypeScript, Tailwind CSS, Lucide icons, SQLite, and Node.js. Data is stored in a persistent SQLite database.

## Run with Docker Compose

On Ubuntu 24.04 with Docker Compose installed:

```sh
git clone https://github.com/jayden-ferianto/ecce-veritas.git
cd ecce-veritas
docker compose up -d --build
```

Open `http://<server-ip>:3000`. To add it in CasaOS, create a custom app using this Compose configuration or deploy the project from its folder. The `habit-data` volume keeps your database when the container is rebuilt or upgraded. Set the `TZ` environment variable in Compose to your server's IANA timezone (for example, `Asia/Singapore`) so daily habit check-ins reset at the expected local midnight.

To back up the database, stop the app and copy the `habits.db` file from the Docker volume. Keep the port private to your network or put the app behind an authenticated reverse proxy before exposing it to the internet; this initial version does not include user accounts.

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

Clone it onto the Ubuntu server once, then start the app:

```sh
git clone https://github.com/YOUR-USERNAME/ecce-veritas.git
cd ecce-veritas
docker compose up -d --build
```

For each later change, publish it from Windows:

```powershell
git add .
git commit -m "Describe your change"
git push
```

Then update the running server from the same project folder:

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

The local database is created at `data/habits.db`. Set `DATABASE_PATH` to use another location. Set `TZ` to configure the local day boundary if your machine's timezone is not the one you want to use.

## Features

- Daily habits that can be checked off once per day.
- Counted habits with configurable daily targets and increment/decrement controls.
- Optional descriptions, daily overview progress, 30-day history, streaks, and individual habit status pages.

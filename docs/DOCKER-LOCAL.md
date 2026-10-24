# COEX local Docker testing

This stack runs the Next.js development server, Express API and a fresh MongoDB
database named `coex_docker_local`. It does not import existing data. Mail and
channel workers are not started, and Microsoft/S3/integration credentials are not
copied into the image. Attachments use a dedicated Docker volume.

## First run

On this Mac, Docker's app is installed at
`/Volumes/sd-mac/Developer/Docker/Applications/Docker.app`, and its container disk
is configured under `/Volumes/sd-mac/Developer/Docker/data`. Keep `sd-mac` mounted
while Docker is running. Small macOS settings and command shortcuts remain in the
user Library and `~/.docker`.

The repository helper finds this installation and creates a local secret on first
use. From the repository root:

```bash
sh scripts/docker-local.sh up --build -d
sh scripts/docker-local.sh run --rm seed
sh scripts/docker-local.sh logs -f web api
sh scripts/docker-local.sh down
```

The equivalent commands for any Mac with Docker on its PATH are below.

Install and launch Docker Desktop for Apple silicon, then check `docker version`
and `docker compose version` work. Run these commands from the repository root:

```bash
# Create a local secret once. This file is ignored by Git.
node -e 'const fs = require("node:fs"); if (!fs.existsSync(".env.docker.local")) fs.writeFileSync(".env.docker.local", "COEX_DOCKER_AUTH_SECRET=" + require("node:crypto").randomBytes(32).toString("hex") + "\n", {mode: 0o600, flag: "wx"})'
docker compose --env-file .env.docker.local -f compose.local.yaml up --build -d
docker compose --env-file .env.docker.local -f compose.local.yaml run --rm seed
```

Open http://localhost:3110 and sign in as `docker-admin@example.test` using the
password printed by the seed command. Save it when displayed; later seed runs do
not reset it. This is a local synthetic administrator in the DigiSol tenant created
by the existing seed script.

## Everyday commands

```bash
docker compose --env-file .env.docker.local -f compose.local.yaml logs -f web api
docker compose --env-file .env.docker.local -f compose.local.yaml down
# After source or dependency changes, rebuild the copied application:
docker compose --env-file .env.docker.local -f compose.local.yaml up --build -d
```

Stopping preserves database and attachment volumes. Avoid `down -v` unless you
intend to erase this stack's local data. The database and API have no host port;
the web app binds to this Mac's loopback interface on port 3110.

This initial setup uses development mode and copied source, without live source
mounts. It is not a production image or a production deployment validation.
The API module flags remain disabled, matching the application's default; API
module migration flows and external integrations need separate configuration and
testing. Existing `.env` and `.env.local` files are excluded and never mounted.

## Verified on this Mac — 23 October 2026

- Docker Desktop 4.96.3, Engine 29.9.2, Compose 5.6.1.
- Disk image created at `/Volumes/sd-mac/Developer/Docker/data/Docker.raw`;
  64 GiB capacity limit, 3 GiB VM memory. The disk file grows as space is used.
- Images built successfully with `npm ci`; web/API started and MongoDB became healthy.
- `/login` returned HTTP 200; the synthetic administrator signed in through the
  browser and reached `/dashboard`.
- Internal API OpenAPI endpoint responded successfully from the web container.
- Confirmed the web container uses `mongo/coex_docker_local`, with no root
  `.env` or `.env.local` files in the image.
- Local login details are saved privately at
  `/Volumes/sd-mac/Developer/Docker/coex-local-login.txt`.
- Dependency installation reported 10 audit findings (3 moderate, 6 high,
  1 critical). Dependency versions were preserved; resolving those findings is
  separate from this local Docker setup.

This verifies startup and sign-in, rather than full application workflow QA.
No production services or data were changed, and no commit or push was made.

Docker CLI shortcuts are also stored under `/Volumes/sd-mac/Developer/Docker/bin`
and CLI plugins under `/Volumes/sd-mac/Developer/Docker/cli-plugins`. New login
shells use this path, which was verified after restart.

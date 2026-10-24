#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

docker_bin="${COEX_DOCKER_BIN:-$HOME/.docker/bin/docker}"
if [ ! -x "$docker_bin" ]; then
  docker_bin="/Volumes/sd-mac/Developer/Docker/Applications/Docker.app/Contents/Resources/bin/docker"
fi
if [ ! -x "$docker_bin" ]; then
  echo "Docker is not installed. See docs/DOCKER-LOCAL.md." >&2
  exit 1
fi
PATH="$(dirname "$docker_bin"):$PATH"
export PATH

if [ ! -f .env.docker.local ]; then
  node -e 'require("node:fs").writeFileSync(".env.docker.local", "COEX_DOCKER_AUTH_SECRET=" + require("node:crypto").randomBytes(32).toString("hex") + "\n", {mode: 0o600, flag: "wx"})'
fi

exec "$docker_bin" compose --env-file .env.docker.local -f compose.local.yaml "$@"

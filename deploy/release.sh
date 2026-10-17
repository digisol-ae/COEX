#!/usr/bin/env bash
#
# One command to deploy main on the app server, with a safety net.
#
#   cd /srv/coex/app && bash deploy/release.sh
#
# It does what the runbook in DEPLOYMENT-STATUS.md does by hand (ff-only pull, npm ci, build, pm2
# restart with --update-env, pm2 save) and adds the two things a person forgets at the end of a
# long day: it checks the site answers afterwards, and it goes back to the previous commit if the
# build or the check fails. It never touches Apache, the database or .env. The nightly 2am backup
# (deploy/backup.sh) is the backup; run that first yourself before anything risky.
#
# Safe to run when nothing is new: it says so and stops before changing anything.

set -euo pipefail

APP_DIR="${COEX_APP_DIR:-/srv/coex/app}"
BRANCH="${COEX_BRANCH:-main}"
SITE_URL="${COEX_HEALTH_URL:-http://127.0.0.1:3100/login}"
PROCESSES=(coex-app coex-mail coex-desk-close coex-channels)

# A shell that loaded .env has NODE_ENV=production, and npm ci then skips the build tools
# (DEPLOYMENT-STATUS.md, 13 Oct 2026). Starting clean makes that impossible.
unset NODE_ENV

cd "$APP_DIR"

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "The server folder has local changes. Stop: look at 'git status' first." >&2
  exit 1
fi

previous="$(git rev-parse HEAD)"
git fetch --quiet origin "$BRANCH"
target="$(git rev-parse "origin/$BRANCH")"

if [ "$previous" = "$target" ]; then
  echo "Already up to date at ${previous:0:7}. Nothing to deploy."
  exit 0
fi

echo "Deploying ${previous:0:7} -> ${target:0:7}"
git merge --ff-only "origin/$BRANCH"

build_and_restart() {
  npm ci
  npm run build
  pm2 restart "${PROCESSES[@]}" --update-env
  pm2 save
}

site_answers() {
  for _ in $(seq 1 20); do
    code="$(curl -s -o /dev/null -w '%{http_code}' "$SITE_URL" || true)"
    [ "$code" = "200" ] && return 0
    sleep 3
  done
  return 1
}

roll_back() {
  echo "Going back to ${previous:0:7}" >&2
  git reset --hard "$previous"
  build_and_restart
  site_answers && echo "Rolled back. The site answers." >&2 || echo "ROLLED BACK BUT THE SITE DOES NOT ANSWER: check pm2 logs." >&2
}

if ! build_and_restart; then
  echo "The build or restart failed." >&2
  roll_back
  exit 1
fi

if ! site_answers; then
  echo "The site did not answer on $SITE_URL after the restart." >&2
  roll_back
  exit 1
fi

pm2 status
echo "Deployed ${target:0:7}. The site answers."

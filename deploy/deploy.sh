#!/usr/bin/env bash
#
# Deploy the current main branch.
#
# Build into a new directory, then swap a symlink. The running version is never half replaced, and
# going back is one symlink change rather than a rebuild under pressure.
#
#   sudo -u coex /srv/coex/deploy.sh

set -euo pipefail

ROOT="${COEX_ROOT:-/srv/coex}"
REPO="${COEX_REPO:-git@github.com:digisol-ae/COEX.git}"
BRANCH="${COEX_BRANCH:-main}"

release="$ROOT/releases/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$ROOT/releases"

echo "Fetching $BRANCH"
git clone --depth 1 --branch "$BRANCH" "$REPO" "$release"

cd "$release"

echo "Installing"
npm ci --omit=dev --ignore-scripts=false

echo "Building"
set -a
. "$ROOT/shared/.env"
set +a
npm run build

echo "Switching over"
ln -sfn "$release" "$ROOT/current"
sudo systemctl restart coex

# Four releases is enough to go back from anything you would want to go back from.
ls -1dt "$ROOT"/releases/* | tail -n +5 | xargs -r rm -rf

echo "Deployed $release"

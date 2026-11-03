#!/bin/bash
# Start the current release on blue 3001 with COEX_APP_URL=https://worktello.com
set -euo pipefail
REL=/srv/coex/releases/contracts-20261026; RT=/srv/coex/shared/runtimes/node-v22.23.4-linux-x64/bin
B=/srv/coex/shared/backups/worktello-domain-20261026; mkdir -p -m 700 $B
cp -p $REL/.env $B/release-env-before; pm2 jlist > $B/pm2-before.json; chmod 600 $B/*
for f in coex.conf coex-le-ssl.conf worktello.conf worktello-le-ssl.conf; do cp /etc/apache2/sites-available/$f $B/$f.before; done
sed -i 's#^COEX_APP_URL=.*#COEX_APP_URL=https://worktello.com#' $REL/.env
grep -q '^AUTH_URL=' $REL/.env && sed -i 's#^AUTH_URL=.*#AUTH_URL=https://worktello.com#' $REL/.env || true
grep -E '^(COEX_APP_URL|AUTH_URL)=' $REL/.env
KEY=$(python3 -c 'import json;print([p for p in json.load(open("'$B'/pm2-before.json")) if p["name"]=="coex-app-green"][0]["pm2_env"]["env"]["NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"])')
COP=$(python3 -c 'import json;print([p for p in json.load(open("'$B'/pm2-before.json")) if p["name"]=="coex-app-green"][0]["pm2_env"]["env"].get("COEX_COPILOT_ENABLED",""))')
pm2 delete coex-app >/dev/null
cd $REL
PATH=$RT:$PATH PORT=3001 NODE_ENV=production COEX_COPILOT_ENABLED="$COP" NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$KEY" \
  pm2 start $RT/npm --name coex-app --interpreter $RT/node --cwd $REL -- start -- -p 3001 --hostname 127.0.0.1 >/dev/null
sleep 12
for i in 1 2 3; do curl -s -o /dev/null -w '%{http_code} ' http://127.0.0.1:3001/login; done; echo
curl -s -D - -o /dev/null http://127.0.0.1:3001/api/auth/entra | grep -i '^location' | cut -c1-160

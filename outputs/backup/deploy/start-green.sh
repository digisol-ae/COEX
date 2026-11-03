#!/bin/bash
# usage: start-green.sh NAME
set -euo pipefail
NAME=$1; REL=/srv/coex/releases/$NAME; RT=/srv/coex/shared/runtimes/node-v22.23.4-linux-x64/bin
B=/srv/coex/shared/backups/$NAME; mkdir -p -m 700 $B
pm2 jlist > $B/pm2-before.json; chmod 600 $B/pm2-before.json
cp /etc/apache2/sites-available/coex.conf $B/http-before.conf
cp /etc/apache2/sites-available/coex-le-ssl.conf $B/https-before.conf
KEY=$(python3 -c 'import json;print([p for p in json.load(open("'$B'/pm2-before.json")) if p["name"]=="coex-app"][0]["pm2_env"]["env"]["NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"])')
COP=$(python3 -c 'import json;print([p for p in json.load(open("'$B'/pm2-before.json")) if p["name"]=="coex-app"][0]["pm2_env"]["env"].get("COEX_COPILOT_ENABLED",""))')
pm2 delete coex-app-green
cd $REL
PATH=$RT:$PATH PORT=3002 NODE_ENV=production COEX_COPILOT_ENABLED="$COP" NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$KEY" \
  pm2 start $RT/npm --name coex-app-green --interpreter $RT/node --cwd $REL -- start -- -p 3002 --hostname 127.0.0.1
sleep 12
for i in 1 2 3 4 5; do curl -s -o /dev/null -w '%{http_code} ' http://127.0.0.1:3002/login; done; echo

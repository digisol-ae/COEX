#!/bin/bash
# usage: prepare.sh NAME SHA   (archive at /tmp/NAME.tgz)
set -euo pipefail
NAME=$1; SHA=$2
REL=/srv/coex/releases/$NAME
PREV=${3:-/srv/coex/releases/contracts-20261026}
RT=/srv/coex/shared/runtimes/node-v22.23.4-linux-x64/bin
export PATH=$RT:$PATH
LOG=/tmp/$NAME-prepare.log
exec >"$LOG" 2>&1
echo "start $(date -Is)"
test ! -e "$REL"
mkdir "$REL"
tar xzf /tmp/$NAME.tgz -C "$REL"
cp -p "$PREV/.env" "$REL/.env"
ln -s /srv/coex/shared/storage "$REL/.storage"
python3 - "$REL" "$SHA" "$PREV" <<'PY'
import json,sys,hashlib,datetime
rel,sha,prev=sys.argv[1:]
h=hashlib.sha256(open('/tmp/'+rel.split('/')[-1]+'.tgz','rb').read()).hexdigest()
json.dump({"sourceCommit":sha,"archiveSha256":h,"previousRelease":prev,"previousPort":3001,"candidatePort":3002,"preparedAt":datetime.datetime.utcnow().isoformat()+"Z"},open(rel+'/RELEASE.json','w'),indent=2)
PY
KEY=$(pm2 jlist | python3 -c 'import json,sys;print([p for p in json.load(sys.stdin) if p["name"]=="coex-app"][0]["pm2_env"]["env"]["NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"])')
cd "$REL"
npm ci --no-audit --no-fund
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$KEY" NODE_ENV=production npm run build
cp -rn "$PREV/apps/web/.next/static/." "$REL/apps/web/.next/static/"
echo "BUILD_OK $(date -Is)"

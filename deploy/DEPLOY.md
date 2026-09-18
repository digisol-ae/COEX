# Deploying COEX to a VPS

Written for Ubuntu on a 4 vCPU, 8 GB machine that already runs something else. Everything here
assumes COEX is a guest on that server and must not disturb what is there.

MongoDB runs on the same machine. COEX listens on 127.0.0.1:3100 and is never exposed directly:
whatever web server already owns ports 80 and 443 puts it on a subdomain.

## Before anything else: find out what is already running

Run these four and keep the output. Nothing here changes a thing.

```bash
sudo ss -lntp | grep -E ':80|:443'     # what holds the web ports
which nginx apache2 caddy docker       # what is installed
ls /etc/nginx/sites-enabled 2>/dev/null; ls /etc/apache2/sites-enabled 2>/dev/null
node --version 2>/dev/null; mongod --version 2>/dev/null
```

The first line decides the rest. The four cases:

| What you see | What it means |
|---|---|
| `nginx` | Use `deploy/nginx-coex.conf`. Easiest case. |
| `apache2` | Same idea, an Apache virtual host with `ProxyPass / http://127.0.0.1:3100/`. |
| A control panel (CyberPanel, Plesk, CloudPanel, hPanel) | Do not edit its config files by hand; it will overwrite them. Add the subdomain in the panel, then use its own reverse proxy or "Node.js application" screen to point at 127.0.0.1:3100. |
| `docker-proxy` | Something is published through Docker. Add COEX to that setup rather than beside it, or the two will fight over the port. |

**Do not install Nginx if something else is already listening.** Two web servers cannot both hold
port 80, and the one that loses is whichever restarts second, which may be the live one.

## 1. A user and a place to live

```bash
sudo adduser --system --group --home /srv/coex coex
sudo mkdir -p /srv/coex/{releases,shared/storage,shared/backups}
sudo chown -R coex:coex /srv/coex
```

Running as its own user means a mistake in COEX cannot touch the other service's files.

## 2. Node 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version    # expect v22.x
```

If Node is already there for the other service and is a different major version, do not replace it.
Install `nvm` under the `coex` user instead and point the service file at that binary.

## 3. MongoDB

Follow MongoDB's own current instructions for your Ubuntu release, then **read
`deploy/mongod-security.md` and do both things in it before putting any data in.** Loopback only,
authentication on. That file exists because those two settings are the difference between a private
database and one that gets held to ransom.

## 4. The environment file

```bash
sudo -u coex tee /srv/coex/shared/.env >/dev/null <<'EOF'
MONGODB_URI=mongodb://coex_app:PASSWORD@127.0.0.1:27017/coex?authSource=admin
STORAGE_DIR=/srv/coex/shared/storage
NODE_ENV=production
EOF
sudo chmod 600 /srv/coex/shared/.env
```

Those three are all COEX reads. Everything else in `.env.example` is a placeholder for work that
does not exist yet.

## 5. Let the server pull from GitHub

The repository is private, so the `coex` user needs a deploy key:

```bash
sudo -u coex ssh-keygen -t ed25519 -f /srv/coex/.ssh/id_ed25519 -N ''
sudo -u coex cat /srv/coex/.ssh/id_ed25519.pub
```

Paste that into GitHub, repository Settings, Deploy keys, read only.

## 6. First deploy

```bash
sudo cp /srv/coex/releases/*/deploy/deploy.sh /srv/coex/deploy.sh 2>/dev/null || true
sudo -u coex git clone --depth 1 git@github.com:digisol-ae/COEX.git /srv/coex/releases/first
sudo cp /srv/coex/releases/first/deploy/deploy.sh /srv/coex/deploy.sh
sudo chmod +x /srv/coex/deploy.sh
sudo -u coex /srv/coex/deploy.sh
```

The build takes a few minutes and peaks around 2 GB of memory, which is comfortable on 8 GB even
with the other service running.

## 7. The service

```bash
sudo cp /srv/coex/current/deploy/coex.service /etc/systemd/system/coex.service
sudo systemctl daemon-reload
sudo systemctl enable --now coex
sudo systemctl status coex
curl -I http://127.0.0.1:3100/login    # expect 200
```

If that curl works, COEX is running. Everything after this is about letting people reach it.

## 8. The subdomain

Point an A record for your chosen name, for example `coex.digisol.ae`, at the server's IPv4 address
and wait for it to resolve. Then add the reverse proxy in whichever of the four cases you are in.
For Nginx, `deploy/nginx-coex.conf` is ready; change the `server_name` if your subdomain differs.

Then the certificate:

```bash
sudo certbot --nginx -d coex.digisol.ae
```

**Do not skip this.** Sign in sends a password, and without a certificate it crosses the network in
the clear and every browser tells your team the site cannot be trusted. Ten days of that teaches
people to click through warnings, which is a habit worth more than the ten days.

## 9. Create your account

From your Mac, with `MONGODB_URI` pointed at the server, or on the server itself:

```bash
cd /srv/coex/current
sudo -u coex env $(cat /srv/coex/shared/.env | xargs) npm run seed
```

It prints the administrator password once. It is not stored anywhere else and cannot be printed
again; change it after your first sign in.

## 10. Backups, before the team starts

```bash
sudo -u coex crontab -e
```

```
0 2 * * * set -a; . /srv/coex/shared/.env; set +a; /srv/coex/current/deploy/backup.sh >> /srv/coex/shared/backup.log 2>&1
```

Then prove it works, tonight, not in a fortnight:

```bash
set -a; . /srv/coex/shared/.env; set +a
/srv/coex/current/deploy/backup.sh
ls -lh /srv/coex/shared/backups
```

A backup nobody has restored is a rumour. Copy the archives off this machine too, and turn on your
provider's snapshots. A backup on the same disk as the database survives a mistake but not a dead
server.

## Updating later

```bash
sudo -u coex /srv/coex/deploy.sh
```

Builds the new version beside the running one and swaps a symlink, so the site is never half
replaced. To go back, point `/srv/coex/current` at the previous release and restart.

## When something is wrong

```bash
sudo journalctl -u coex -n 100 --no-pager     # the app's own output
sudo systemctl status coex
sudo ss -lntp | grep 3100                     # is it listening
```

The usual causes, in the order they happen: `MONGODB_URI` wrong or the password not filled in, the
MongoDB user missing the `coex` database in its roles, or the reverse proxy pointing at the wrong
port.

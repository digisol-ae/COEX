# MongoDB on the same machine, safely

Two settings, and neither is optional. An unauthenticated MongoDB reachable from the internet is
found by scanners within hours and its contents are held to ransom. This has happened to tens of
thousands of installations, and it is always these two settings.

## 1. Listen on loopback only

In `/etc/mongod.conf`:

```yaml
net:
  port: 27017
  bindIp: 127.0.0.1
```

Nothing outside the machine can then reach the database at all, which is correct here because the
only thing that needs it is COEX, running on the same machine.

## 2. Turn authentication on

Create the user first, or you will lock yourself out:

```
mongosh
```

```javascript
use admin
db.createUser({
  user: 'coex_app',
  pwd: '<a long random password>',
  roles: [{ role: 'readWrite', db: 'coex' }],
})
```

Then in `/etc/mongod.conf`:

```yaml
security:
  authorization: enabled
```

```
sudo systemctl restart mongod
```

The connection string in `/srv/coex/shared/.env` is then:

```
MONGODB_URI=mongodb://coex_app:<that password>@127.0.0.1:27017/coex?authSource=admin
```

Generate the password with `openssl rand -base64 24` and paste it straight into the two places it
belongs. It never needs to be typed by a person, so make it long.

## 3. Check it

```
sudo ss -lntp | grep 27017
```

The only line should show `127.0.0.1:27017`. If it shows `0.0.0.0:27017`, stop and fix bindIp
before going any further.

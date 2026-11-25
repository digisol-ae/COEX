> Completed on 25 November 2026 after explicit owner authorization for isolated administrator
> recovery. Production now runs authenticated worktello-rs. Do not rerun initialization or recovery.
> Current evidence and rollback: ../ai/RELEASE-2026-11-25-SAAS.md. The procedure below records the
> initial administrator-assisted plan, before the owner reported forgotten local administrator access.

# Authenticated MongoDB transaction prerequisite

Prepared 25 November 2026. Do not run during ordinary traffic. The release coordinator must first
finish candidate validation, announce a short maintenance/edit pause, stop application writers
and workers, and take/verify a consistent database and storage backup. The online preflight copy
is additional protection, not a substitute for the final quiet backup.

Production currently has authentication enabled and no replica set. The application account has
readWrite on coex, which cannot run replSetInitiate. Use an existing MongoDB administrator with
cluster-management privileges. Never paste credentials into chat, commit them, disable MongoDB
authentication, or expose MongoDB beyond loopback.

The release coordinator can prepare this OS configuration with existing authorized SSH access:

1. Preserve /etc/mongod.conf and existing process/proxy definitions in the private release backup.
2. Generate a cluster key file using openssl rand -base64 756, owned by mongodb, mode 0400.
   Configure security.keyFile with its path while retaining security.authorization: enabled.
3. Add replication.replSetName: worktello-rs; keep the existing loopback bind and port 27017.
4. Restart only mongod and verify its service log; keep maintenance in effect.

The database administrator then runs this on the server, with the password entered at the prompt:

```sh
mongosh --host 127.0.0.1 --port 27017 --username ADMIN_USERNAME --authenticationDatabase admin --password
```

Inside that authenticated administrator session:

```javascript
rs.initiate({ _id: 'worktello-rs', members: [{ _id: 0, host: '127.0.0.1:27017' }] })
rs.status()
db.adminCommand({ hello: 1 })
```

Wait for PRIMARY and isWritablePrimary: true. The coordinator must then verify a transaction with
the real application account using an aborted transaction before starting the candidate and
switching traffic. Do not change application passwords, session keys, or existing account roles.

Before initialization, a failed startup can be rolled back using the private original configuration.
After successful initialization, retain the replica-set configuration for application rollback;
existing application releases can connect to its primary. Do not restore or delete business data
merely to switch application versions. If database initialization fails, retain maintenance and
resolve it with the administrator before any application cutover.

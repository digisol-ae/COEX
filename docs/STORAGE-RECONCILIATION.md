# Storage accounting maintenance

The platform-owner command previews actual retained bytes by default. It never deletes, archives,
or moves files, including unidentified files and deletion tombstones. Apply records the previous
counter, measured counter and mandatory reason in one MongoDB transaction with its audit record.
Symbolic links and unsupported filesystem objects stop the scan for operator review.

Run from the deployed release using its normal Node runtime, environment and shared storage path:

```sh
node --env-file=.env node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.json scripts/reconcile-storage.ts --tenant TENANT_ID --actor EXISTING_PLATFORM_OWNER_ID
node --env-file=.env node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.json scripts/reconcile-storage.ts --tenant TENANT_ID --actor EXISTING_PLATFORM_OWNER_ID --apply --reason 'Recover stale upload reservations after incident review'
```

All web processes, workers and scripts writing this storage root must first be upgraded to the
guarded adapter. Stop older writers during the first rollout; they do not understand the lock.
Direct filesystem maintenance must stop while reconciliation runs. Separate unshared disks are
unsupported; these markers coordinate only processes using the same shared filesystem.

Every upload/removal creates a marker in `.active-writes` before checking `.reconciliation-lock`.
Reconciliation owns that lock before checking for active writers. Existing writers cause the job
to refuse; new writers receive a temporary maintenance error. Downloads continue normally. A failed
scan or audit releases its lock, and a failed mutation releases its own marker.

After a process crash, markers deliberately remain conservative. A stale writer marker blocks
reconciliation; a stale reconciliation lock blocks new uploads/removals. Stop all writers and verify
no maintenance job remains before removing only the stale `.active-writes` markers or empty
`.reconciliation-lock` directory. Preserve tenant files, then preview and apply reconciliation with
an incident reason. Never automatically expire a lock while an operation could still be running.

This repairs accounting, not capacity. The 50 GB offsite archival policy still needs an approved
archive destination and a recoverable storage adapter. A single-member replica set supports the
audit transaction but does not provide database high availability.

26 November rollout: all 19 older web slots are stopped and all three workers use the guarded
adapter. Live previews matched both tenant counters (66,264,257 bytes and zero), so no counter
changes were applied. Root-only operation evidence is in the release backup.

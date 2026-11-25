# SaaS release preparation — 25 November 2026

Status: deployed to https://worktello.com. Payments explicitly remain in docs/BACKLOG.md.

Current source: aefe952; PR #94 merged as 83c61f1422ede997b55594a6f2ac813fb10dd847.
Release: /srv/coex/releases/saas-20261125-aefe952; coex-app-saas-20261125 serves loopback
3019. All four Worktello/COEX vhosts target 3019. All three workers use the same release.
PM2 saved. Authenticated live owner dashboard and SaaS administration reads passed on 26 November.

The following preparation notes are historical; the deployment outcome below supersedes them.

Source: dedicated managed release checkout based on origin/main c7fc5fc. The original working
checkout remains intact. SaaS changes were selectively reapplied; unrelated local signed-evidence,
PDF-cover and branding changes were excluded. Overlapping current email, tenant settings and
contract services retain upstream signing, invitation, sender and PDF behaviour. Module guards
were added to the current signature service rather than replacing it with the older local version.

Read-only production verification: Worktello and COEX vhosts currently target loopback 3018;
active coex-app-draft-pdf runs /srv/coex/releases/draft-pdf-20261116/apps/web. That release records
merged main 8bba1b1 (c7fc5fc adds documentation). Mail runs from contract-email-worker-20261111;
desk-close and channels workers remain on worktello-20261025. All three need the new module/access
checks at cutover. Preserve their original definitions for rollback. Storage currently occupies 64 MB.

## Transaction prerequisite

Production MongoDB is authenticated standalone, with no replica set. The application account has
readWrite on coex only. New commercial/provisioning operations require transactions. MongoDB
administrator access is required before enabling an authenticated single-node replica set.
Do not deploy web code that assumes transactions against the current standalone deployment.

Administrator credential location / administrator-run commands requested from owner; no database
configuration, authentication, account, replica set, proxy target or worker was changed.

## Planned controlled cutover

1. Finish combined source tests/build and CI; create a candidate release retaining canonical
   environment, server-action key, authentication secrets, shared storage and existing static assets.
2. Prepare a private backup of DB, storage, Mongo config and original Apache/PM2 definitions.
3. With administrator access available, announce a short edit pause; use maintenance responses
   and stop app writers/workers for a consistent backup and authenticated replica-set setup.
4. Verify primary readiness and a rollback-only test transaction without creating business data.
5. Start candidate on a free loopback port and run checks before changing public proxy targets.
   Migrate only the three workers that need these access controls, keeping compatible rollback.
6. Check Apache config before graceful reload, monitor public HTTPS/static assets and verify
   authenticated acceptance. Restore old app/proxy/workers on failure; do not restore business
   data or disable authentication as an application rollback.

Public trial registration remains closed by default until the owner configures/enables it.
The team's final landing-page design is not part of this release; source/assets are pending.

## Release validation

Current-main integrated suite: 877/877 passed, 0 failed. Workspace type checks, production Webpack build, source lint and full formatting check passed. The original mixed-checkout signed-evidence failure is not present in this release candidate.

Private online preflight backup: /srv/coex/shared/backups/saas-20261125-preflight-7rgeJy. DB archive 6,393,441 bytes; storage archive 62,112,383 bytes. Gzip/tar integrity passed. This is not the final quiet backup. Original Mongo config, Apache files and private PM2 definitions are retained there. Production traffic, accounts and DB configuration remain unchanged.

Administrator procedure: deploy/SAAS-TRANSACTION-PREREQUISITE.md. Awaiting owner-provided secure administrator access or administrator execution.

## Deployment outcome and database recovery

The owner explicitly authorized controlled administrator recovery after confirming the supplied
Atlas credentials did not belong to this local MongoDB. Fresh quiet backups were taken after
maintenance responses and stopping all 21 previously online COEX processes. Verified private
backup directory: /srv/coex/shared/backups/saas-20261125-recovery-e07mlwu5 (root-only).

- Database logical archive: 6,400,201 bytes.
- Shared storage archive: 62,112,383 bytes.
- Stopped MongoDB cold archive: 283,179,950 bytes.
- Original Mongo configuration, all four vhosts, original online process names and private PM2
  definitions are retained there. Do not print private definitions or credential files.

Administrator recovery used the same database files only while the normal daemon was stopped.
The temporary process ran in an isolated Linux network namespace, with no Unix socket; its port
was verified unreachable from the host namespace. A new local administrator was created without
changing coex_app or business records. Credentials are in /srv/coex/shared/secrets/mongodb-admin.json,
root-owned mode 0600 under a restricted directory. No credentials were printed or committed.
The ordinary service was restarted with authorization enabled and the recovered account verified.

Authenticated worktello-rs was then enabled using /etc/mongodb/worktello-rs.key (mongodb owner,
mode 0400), member localhost:27017, retaining bindIp 127.0.0.1 and authorization enabled. The first
startup exposed a parent-directory permission issue; directory traversal was corrected before
initialization. Unauthenticated collection access is denied. The real app account successfully
opened a snapshot transaction and aborted it. All 52 collection document counts matched the quiet
logical dump before traffic and workers resumed. A single member enables transactions; it does
not provide high availability or replace backups.

## Cutover and verification

Candidate source archive SHA256 f8be7e9d36ce91df5656a5c35059107dd5b99857a9f2bb8d8b2f1229606623d9
matched on server. Candidate source matches merged main for deployed files. Existing environment,
application password, authentication secrets, shared storage and server-action encryption key were
preserved. Previous public static assets were retained in the candidate. All three workers were
recreated using their saved environment and the candidate working directory after PM2 restart
proved insufficient to change cwd. The 18 original warm web slots were resumed, including the
immediate prior rollback on 3018. PM2 saved the final definitions.

Validation: 877/877 integrated tests; local type/lint/format; local Webpack and default Turbopack
build without a database; CI 45581234485 passed on aefe952; updated server production build passed.
Local authenticated browser verified Support list/full detail with disabled Tasks/Contracts denied.
Live home, login and registration return 200; 12 referenced public static assets return 200.
Public registration remains closed. No synthetic live tenants, accounts, tickets or test messages
were created; routine workers resumed after cutover. Live authenticated owner dashboard, Setup → Tenants, 30-day/2 GB defaults, legacy tenant
usage, catalogue/application panels and current module controls passed on 26 November. No live
commercial changes were submitted. End-to-end real registration email remains separate. RELEASE.json and private post-deploy-summary.json record runtime evidence.

## Application rollback

Keep MongoDB authenticated and keep the initialized replica set. Do not restore business data or
revert to standalone merely to roll back application code. Restore the four saved vhost files
(target 3018), config-test and gracefully reload Apache. coex-app-draft-pdf remains the immediate
prior web slot. For workers, use the saved private PM2 definitions and recreate only coex-mail,
coex-desk-close and coex-channels with their original working directories and environment, then
save PM2. Original worker roots: contract-email-worker-20261111 for mail; worktello-20261025 for
channels and desk-close. Check HTTPS and worker stability after any rollback.

References: https://www.mongodb.com/docs/manual/tutorial/convert-standalone-to-replica-set/
and https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set-with-keyfile-access-control/.

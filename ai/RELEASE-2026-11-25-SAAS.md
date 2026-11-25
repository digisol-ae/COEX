# SaaS release preparation — 25 November 2026

Status: preparation, not deployed. Payments explicitly remain in docs/BACKLOG.md.

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

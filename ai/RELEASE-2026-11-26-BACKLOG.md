# Worktello landing and feedback release — 26 November 2026

PR [#97](https://github.com/digisol-ae/COEX/pull/97) merged as
`13286bd51fb1a1e25ddea96aa52bd54d10348d62`. Compiled source:
`f26c82437a8b2e435e121dca1db8d9547e707603`; its application tree matches the merged main tree.
Source archive SHA-256: `0fe6099231eb71a280e3483525e3a3195579b14e0a3c3f041aff19f06fd20d50`.

## Live runtime

- Release `/srv/coex/releases/backlog-20261126-f26c824`; web `coex-app-backlog-20261126`,
  PM2 id 26, loopback **3020**.
- Workers `coex-mail` 27, `coex-desk-close` 28 and `coex-channels` 29 use this same release.
  All four were online with zero restarts at the post-cutover check; PM2 saved.
- Node runtime `/srv/coex/shared/runtimes/node-v22.23.4-linux-x64/bin/node`.
- All four Worktello/COEX HTTP/HTTPS Apache vhosts target 3020. Apache overwrites the forwarded
  client-IP header from its socket peer and sets the actual HTTP/HTTPS protocol; configurations
  passed configtest and were verified after reload. No forwarded-header packet probe is claimed.
- Nineteen old web slots are stopped, with definitions retained. Previous source on 3019 is the
  application rollback; it must be started before switching traffic back.
- Existing environment-file chain, authentication/action keys, authenticated MongoDB replica set
  and `/srv/coex/shared/storage` remain. No database recovery or password rotation repeated.
- Maintenance removed. Twenty public HTTPS login samples and twelve referenced static assets
  passed; landing, login, registration and policy routes passed candidate checks. The live landing
  and its theme preview were independently checked in the inbuilt browser.

## Change and verification

The release includes the supplied Figma/original-asset landing page with authorized copy
corrections, Save → Close → Save on task/ticket editing, snapshot-safe folder restoration,
delegated subtasks, password-change enforcement, compact Lead drawers, proxy-safe Gantt PDF
export, guarded storage reconciliation and transactional WhatsApp message → task creation.
Payments remain excluded. [Detailed resolution](../docs/resolutions/2026-11-26-saas-backlog.md).

900 tests across 109 files passed on forced `coex_test_*` databases. Workspace types, full
ESLint/format, local Webpack and server default production builds passed. PR CI
[45740360436](https://github.com/digisol-ae/COEX/actions/runs/45740360436) and merged-main CI
[45740946650](https://github.com/digisol-ae/COEX/actions/runs/45740946650) passed.

Synthetic browser QA covered task/ticket save/edit/close behavior, controlled selection retention,
Lead drawer/Escape, dark Lead and ticket-assignment controls, desktop/mobile landing interactions
and asset bounds, and message → task creation followed by the created task. No production task,
ticket, assignment, commercial setting or customer message was submitted for acceptance.

The existing John Ali session redirected to sign-in after refreshing against the new release:
its existing password-change flag is now enforced. A read-only count found **9 flagged staff**,
including **2 platform administrators**, plus one flagged legacy portal account. That portal account retains verified email-code access,
which discards its flagged temporary password. Ordinary staff need password recovery; no flag or password was
cleared to bypass this check. The owner subsequently completed recovery. Fresh authenticated dashboard, the original R4 task
edit dialog, tenant defaults (30 days / 2 GB), and Module access controls passed live read-only
checks. The task and management dialogs were cancelled without saving; the signed-in dashboard
was left open. This verifies protected reads/rendering, not production mutations.

The owner explicitly cancelled the Mac shutdown request on 26 November; leave the computer running.

Public applications remain closed; approval mode remains selected. One previously authorized
registration QA message was SMTP-accepted; inbox receipt remains unconfirmed. Real XVERSE needs
the vendor API contract. Offsite archival/shared object storage needs an approved destination.
Current retained storage is about 66.3 MB, below the 50 GB archival threshold; disk use was 45.7%,
below the 80% warning threshold. These are dated checks, not an external monitoring subscription.

## Backup and restore evidence

Fresh quiet backup: `/srv/coex/shared/backups/backlog-20261126-372g9wee`, root-only. Database
archive **6,394,943 bytes**, with oplog; storage archive **62,460,714 bytes**; both passed gzip
integrity checks. Private PM2, four original vhosts, operational log and cutover summary retained.
Checkpoint: `/srv/coex/shared/secrets/backlog-release-checkpoint`.

The earlier quiet recovery backup was restored before this cutover into an isolated network
namespace: 52 application collections / 45,287 documents and 484 files / 65,805,848 bytes. Its
MongoDB test port was unreachable from the host namespace; the owned restore sandbox was removed.
This verifies the tested snapshot, not offsite disaster recovery or multi-node availability.

## Application rollback

1. Start `coex-app-saas-20261125` and verify loopback 3019 `/login` returns 200.
2. Stop/delete only the three current workers, then start their original definitions from
   `/srv/coex/releases/saas-20261125-aefe952/ecosystem.rollback-backlog.private.json` as `digisol`.
   This private file contains environment values: never print or publish it.
3. Change all four application vhosts from 3020 to 3019, retaining forwarded-header hardening.
   Run Apache configtest, graceful reload and HTTPS checks; save PM2.
4. Stop the new web after traffic drains. Keep MongoDB authenticated/initialized and preserve
   current business data, shared storage and secrets. **Do not restore business data for an app
   rollback.** Do not use reconciliation while old unguarded writers are running.

Live reconciliation previews matched both tenant counters (66,264,257 bytes and zero); no counter
changes were applied. Final web/worker checks remained online with zero restarts; MongoDB and
web listeners were confirmed loopback-only at 27017 and 3020. Owned operational scripts/source
archive were moved into the private backup after verification.

Reconciliation operation/crash handling: [runbook](../docs/STORAGE-RECONCILIATION.md).

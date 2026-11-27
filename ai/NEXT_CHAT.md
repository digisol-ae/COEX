## Payroll release preparation — 28 November 2026

Owner now authorizes deployment with no automatic What’s New popup. Payroll-only release is prepared on current main in this canonical checkout; unrelated consolidated signing/archive/loader work stays on `codex/consolidated-worktello-20261127`. Zoho and final payslip design remain deferred.

# Independent website live — 27 November 2026

Public website is now a separate private source repository and Contabo runtime: website3025
(PM2 id37), application3023 (id36), prior3022 warm rollback. App PR103 merged `ba06092`,
compiled `6ece330`; website compiled `81d3ca0` matches main `f68b0d0` runtime files.
Owner manager stays at `/website-manager`; its private preview uses the actual separate renderer.
515 tests, types/lint/format, builds, PR/main CI, public health and existing owner desktop/mobile
preview passed. No production content/account/session mutation; workers27/28/29 retain their PIDs.

Website repo: https://github.com/digisol-ae/worktello-website (private, owner-only).
Developer source bundle: `/Volumes/sd-mac/Developer/DigiSol/worktello-website-source.zip`.
Private branch protection needs GitHub Pro on the current plan: do not grant developer write access
until enforced review exists; use reviewed source-bundle patches meanwhile. COEX remains PUBLIC;
owner decision to make it private is pending, and no visibility change was assumed.

Full release, exact routing, acceptance limits, backup evidence and rollback: [release record](RELEASE-2026-11-27-WEBSITE-SEPARATION.md).
Final illustration dependency correction, generated CSS checks and live layered/mobile preview passed.
Keep the Mac running. Earlier runtime statements below are historical.

# Standalone Website Manager live — 26 November 2026

PR #101 / source `2e7637e` is live on **3022**, process `coex-app-website-manager-20261126` id31.
Content management now has its own `/website-manager` layout and section navigation, outside Setup.
Live owner reads and legacy redirects passed; no production content was saved/published as a test.
505 automated tests, types/lint/format, builds and PR/main CI passed. Prior3021 is warm rollback;
workers27/28/29 and sessions/settings are unchanged. Follow-up worktree is
`/Users/syedali/.codex/worktrees/website-manager-redesign/worktello`.
Release/acceptance limits/rollback: [standalone release](RELEASE-2026-11-26-STANDALONE-MANAGER.md).
Earlier runtime statements below are historical. Local QA app/test database are stopped.

# Website editor live — 26 November 2026

PR #99 merged as `2eeaad9`; source `4ffbcb2` is live at https://worktello.com on loopback **3021**
from `/srv/coex/releases/website-editor-20261126-4ffbcb2` (PM2 `coex-app-website-20261126`, id30).
Setup → Website Content includes owner-only drafts, previews, private raster uploads, explicit
publication and restore history. Stored active platform_admin checks enforce all management access.
PR/main CI, 486 unit tests, 14 isolated database tests, production builds, public health/privacy and
signed-in owner editor reads passed. No production content or upload was submitted as a test.
Prior web3020 remains online for rollback; workers27/28/29 and sessions/settings are unchanged.
Backup, acceptance and rollback: [website editor release](RELEASE-2026-11-26-WEBSITE-EDITOR.md).
The supplied landing is preserved. Local QA app/test database are stopped. Leave the Mac running.
Earlier runtime statements below are historical.

# Next chat checkpoint — 26 November 2026

Workspace: `/Users/syedali/.codex/worktrees/saas-release-20261125/worktello`.
Branch: `codex/backlog-completion-20261126`.

Start with `ai/CURRENT_TASK.md`, `ai/HANDOFF.md`,
`ai/RELEASE-2026-11-26-BACKLOG.md` and `docs/BACKLOG-COMPLETION-2026-11-26.md`.

## Completed and live

- PR #97 merged as `13286bd`; source `f26c824` serves Worktello on loopback 3020 from
  `/srv/coex/releases/backlog-20261126-f26c824`. All three workers use this release. Nineteen
  previous web slots are stopped; their definitions and rollback are retained.
- PR #98 documentation merged as `dc36c7920ae28581061f445113c897d4d0856d0f`.
- Supplied Figma/original-asset landing, task/ticket Save → Close → Save, folder restore,
  delegated subtasks, password-change enforcement, Lead drawers, Gantt origin handling,
  guarded storage reconciliation and Setup WhatsApp message → task are deployed.
- 900 isolated tests, types/lint/format, local/server builds and application PR/main CI passed.
  Backup restore and live storage-counter checks passed; private backup and rollback locations
  are in the release record. No storage counter adjustment was needed.
- Owner completed password recovery. Fresh live dashboard, R4 task edit, tenant defaults
  (30 days / 2 GB) and module controls passed protected read checks. Business forms were cancelled.
- Owner confirmed the registration QA email arrived in Inbox. Public trial applications are now
  **open**, with email verification and mandatory platform-owner approval. The audited setting,
  browser application form and anonymous HTTP rendering were verified. No QA application or
  extra test email was submitted.
- Signed-in dashboard remains open in the inbuilt browser. Local QA server and the owned
  `worktello-subscription-test-mongo` container are stopped; test data was retained.

## Remaining dependencies and decisions

1. Real XVERSE connection needs its API contract or confirmation that its team will implement
   the existing canonical API. The shipped message → task tool does not establish real provider
   acceptance. Broader M6 roadmap phases remain distinct from that delivered feedback item.
2. Offsite attachment archival/shared object storage needs an approved archive destination.
   Same-disk compression does not recover VPS capacity. Current retained files are about 66.3 MB,
   below the requested 50 GB archival threshold.
3. Payments and future automatic registration remain deferred. Initial registration approval
   stays mandatory. Optional trial seat/plan defaults await commercial definitions.

**The owner explicitly cancelled shutdown: leave the computer running.** No shutdown is queued.
Password entry remains the owner's responsibility; their recovery is complete. Preserve the
current session and avoid repeating recovery, blanket logout, database recovery or a runtime
restart for this documentation checkpoint.

The original mixed checkout and original asset handoff directory were preserved. Continue from
this release worktree rather than sweeping unrelated changes in the original checkout.

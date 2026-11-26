# Separate Website Manager live — 26 November 2026

PR [#101](https://github.com/digisol-ae/COEX/pull/101) merged as
`70c7ca1321edf44619134e80863b2ffe86486380`. Compiled source `2e7637e` matches
its application tree. Cutover completed at **20:19 PKT / 15:19 UTC on 26 November**.

## Runtime and rollback

- Live: `/srv/coex/releases/website-manager-20261126-2e7637e`, process
  `coex-app-website-manager-20261126` (PM2 id31), loopback **3022**, Node22.23.4.
- All four Worktello/COEX Apache vhosts target3022. Configtest/graceful reload and PM2 save passed.
- Prior website-editor process id30 remains online on3021 as warm rollback. Workers27/28/29
  retain their original processes and source; no worker, database, credential or session restart.
- Fresh private database/storage backup and vhost/PM2 originals:
  `/srv/coex/shared/backups/website-manager-20261126`. Both archives passed gzip integrity.
  This was an online backup; no new restore rehearsal is claimed.
- Rollback: verify3021/login200, restore the four `*.conf.before` files from that backup,
  Apache configtest, graceful reload, HTTPS checks, then save PM2. Do not restore business data.
  Keep3022 until rollback is confirmed. Scoped content remains stored if an older renderer is used;
  that renderer understands legacy overrides only, so return to the new renderer for scoped edits.

## User experience and security

Website Manager is a separate full-page screen at `/website-manager`, with its own layout,
section navigation, labelled fields, live unsaved desktop/mobile preview, click-to-edit text,
thumbnail image library, search/social preview and version history. It is removed from Setup.
Legacy `/setup/website-content` URLs redirect to the separate manager.

Section-specific copy, buttons and image overrides prevent matching text in one section from
changing another. Existing global content and older versions remain compatible through fallback
values. The supplied public Figma layout is preserved. Draft save, explicit publish confirmation,
restore-to-draft and protection for unsaved edits are retained.

The stored active platform_admin service guard remains authoritative for management reads and
writes. Non-owner page requests are denied. Private pages use no-store and restrictive framing;
preview messaging requires the same origin and actual parent/child window. Published-only public
reads, revision CAS, transactional audit and private-media publication rules remain unchanged.

## Validation and acceptance

- 491 unit tests and14 isolated database tests passed, covering scoped/legacy content, escaping,
  navigation/headers, stored-role denial, drafts, concurrent writes, audit rollback and private media.
- Types/lint/format, local and production builds passed.
- PR CI [45844660187](https://github.com/digisol-ae/COEX/actions/runs/45844660187) and merged-main
  CI [45847210409](https://github.com/digisol-ae/COEX/actions/runs/45847210409) passed.
- Local browser: desktop/mobile layout, unsaved preview, text selection/focus, independent section
  labels, draft save, publish review, restore, incomplete-FAQ guidance, thumbnail grid and exit guard.
- The final browser file chooser stalled before an upload completed. It was inspected and not
  retried blindly. Existing service-level upload/privacy/quota tests passed. A full upload through
  the redesigned chooser remains a manual acceptance check; no production upload was attempted.
- Production read-only service check allowed a real active owner and denied a real non-owner with
  forged owner context. Revision was zero. Anonymous manager/preview requests redirect to login
  without editor data; legacy URLs redirect to the manager; private headers passed.
- Live existing owner session rendered the separate manager, its own section navigation and live
  preview with zero Setup dialogs. The old Setup URL completed its redirect to the same page.
- Ten public HTTPS login samples and landing health passed, missing media404/no-store and optimizer
  rejection400 passed. No production website content, draft, media or history mutation was submitted.

## Continuation

Use `/Users/syedali/.codex/worktrees/website-manager-redesign/worktello` for follow-up work.
The earlier release worktree has unrelated user-archive edits, which were not staged or changed.
Local manager QA app and owned MongoDB container are stopped; isolated test data was retained.
No mobile-push tool is available in this session. Completion is reported in this chat; mobile users
can access connected Codex/Remote chats when configured. No completion-tracking automation was made.
Leave the Mac running unless the user explicitly requests otherwise.

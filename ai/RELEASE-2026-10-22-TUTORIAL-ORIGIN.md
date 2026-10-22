# Tutorial origin and assignment-email maintenance release

Deployed 22 October 2026. Application merge: `92525ae237c3e46723bc2461db91ccf05b1968a6`, PR #34. Features: `9af3896`, `ab04ddd`.

## Behavior and owner decisions

- Tutorial POST saves compare browser Origin with request origin or configured COEX_APP_URL/AUTH_URL. Reverse-proxy HTTPS/internal HTTP mismatch no longer rejects the valid site. Missing/foreign origins, forged forwarded hosts and non-admin writes stay rejected. Tutorial errors explain origin/permission failures separately.
- Supplied YouTube embed URL/si parameter already supported. Draft-save regression verifies canonical privacy-enhanced embed URL and inactive tenant-scoped draft persistence calls. No real tutorial saved or published for QA; actual signed-in Preview/playback remains manual acceptance.
- Teams self-assignment remains silent; another selected assignee receives the existing assignment alert according to email settings. Prior override removed, without replaying old emails.
- Latest What's new: **2 bug fixes and 1 improvement** only. Detailed product announcements are for user-facing features/UI changes; internal/backend/rollout details belong in developer docs. Count rationale: tutorial origin fix, undesired self-email behavior correction, clearer tutorial errors.
- Owner now permits a brief maintenance interruption if needed and requested ending existing logins during release. This rollout still used healthy isolated build/graceful switching.

## Verification

- 46 focused tutorial/Teams tests passed. Full workspace types, lint, formatting and **41 unit files / 262 tests** passed locally.
- Final PR CI: https://github.com/digisol-ae/COEX/actions/runs/39802601116 ; merged-main CI: https://github.com/digisol-ae/COEX/actions/runs/39803184419 . Both passed.
- Server native production build: 71 pages. Candidate health and production-env helper check passed: configured public HTTPS origin accepted, foreign origin denied. Compiled maintenance summary verified.
- Action encryption key retained privately and **67** previous static assets remain available. No key/environment contents printed.
- 40/40 HTTPS monitor samples returned 200 through actual Apache vhost during switch. Login/privacy/terms/Teams dialog publicly return 200; tutorial metadata without authentication returns 401. These checks do not claim signed-in YouTube playback acceptance.

## Runtime and recovery

- Active: `coex-app-green` id 6 / PID 181724, loopback 3002, cwd `/srv/coex/releases/tutorial-origin-20261022`, application SHA above. Apache COEX HTTP/HTTPS mappings target 127.0.0.1:3002.
- Warm fallback: `coex-app` id 5 / PID 165915, port 3001, cwd `/srv/coex/releases/teams-email-6a41d1f`. This older code has the prior self-email override; rollback restores prior application behavior as well as prior availability.
- Workers unchanged: mail 159658, desk-close 159673, channels 159698, each restart count 3, cwd `/srv/coex/app`. Five PM2 entries intentionally saved. Original checkout is not the active web app.
- Fresh backups: `/srv/coex/shared/backups/coex-2026-10-22-1906.archive.gz` (497K), `files-2026-10-22-1906.tar.gz` (14M). Filenames use server +04 timestamps. Existing backups not pruned by this manual run.
- Proxy snapshots: `/srv/coex/shared/apache-before-tutorial-20261022191918/`. Monitor: `/tmp/coex-tutorial-switch-20261022191918.log`. Runbook: `deploy/ZERO-DOWNTIME.md`.

## Release sign-in handling

Preflight: 23 unexpired tenant sessions, 3 seen in prior 15 minutes. After healthy cutover, existing tenant sessions with createdAt <= **2026-10-22T15:19:18Z** were marked revokedAt through the existing session mechanism: 23 matched/revoked, 0 old unexpired sessions remaining. New logins after the cutoff were excluded. No tokens/user identities printed; no accounts/passwords changed. Already authorised requests could finish before revocation. Next protected navigation/refresh uses existing login redirection; do not claim instant browser logout or draft preservation.

No database/schema migration, secret change, real test email/task/tutorial publication, or unrelated projects/ upload. Documentation-only follow-up may advance source HEAD without changing the built application or restarting services.

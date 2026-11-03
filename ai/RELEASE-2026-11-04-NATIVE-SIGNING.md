# Native contract signing release — 4 November 2026

Status: live on https://worktello.com. Cutover verified at 01:05 PKT on 4 November 2026 (3 November 20:05 UTC). The preparation notes below describe the pre-switch state; the live record supersedes them.

Owner authorised deploying committed changes after commit 1ae7526. Release branch codex/native-signing-release-20261104 integrates the current main (6bbf492), preserving Customer Resources and its inline sharing/preview workflow. Native signing includes tenant letterhead, draw/upload/type capture, mailbox verification, independent dated history, and protected versioned signing receipts. Provider evaluation stays deferred.

## Current production and rollback

Verified by SSH: coex-app-customer-resources, /srv/coex/releases/customer-resources-20261104, loopback 3008, RELEASE.json application SHA 6f704035702d8a569e063e6cbedf75bc6a2c27dc. All four Worktello/COEX vhosts proxy to 3008. Existing mail/desk-close/channels processes remain online from /srv/coex/releases/worktello-20261025. Do not use the old in-place release.sh.

Candidate: /srv/coex/releases/native-signing-20261104 on unused loopback 3009. Preserve the running environment, signing/encryption keys, writable shared storage, server-action encryption key, and prior hashed static assets. The OS default node is older; use the already-installed /srv/coex/shared/runtimes/node-v22.23.4-linux-x64/bin/node for build/runtime. Preserve the 3008 web process and existing workers.

Private backups: /srv/coex/shared/backups/native-signing-20261104 (mode 0700). Four canonical Apache config snapshots, PM2/environment snapshots, database dump (3,536,585 bytes) and shared storage archive (38,851,056 bytes); gzip validation passed. These private backup files must never be added to Git or local evidence.

## Security and integration

Preflight identified runtime advisories in the older dependency tree. Updated Next.js/eslint-config-next to 16.4.5, compatible runtime dependency versions and deduplicated the old next-auth peer copy. npm audit --omit=dev reports zero vulnerabilities. Development dependency advisories remain separately scoped; no forced authentication API downgrade was applied.

Merge conflicts were resolved preserving current production resource functionality and signing headers. The manual now documents the signing flow. Saved exports, backups, QA and project artifacts from the owner-requested all-files commit are excluded from the production package.

## Gates and acceptance

Require passing full local tests, source types/lint/format, PR and merged-main CI, server build, healthy isolated candidate, revision/static asset evidence and protected-route checks. Then snapshot/modify only the four app vhost upstreams, Apache configtest and graceful reload; bounded HTTPS monitor and rollback on failure. Do not change customer contracts, send customer emails, expire sessions, reset passwords or migrate synthetic data for acceptance.

Actual cutover, revision, CI, process checks and live acceptance are recorded below when completed.

## Local gates completed

- Fresh install and Next 16.4.5 compatibility type checks passed for all workspaces. Root ESLint now declares the config package it imports rather than relying on incidental workspace hoisting.
- Source lint and full CI formatting checks passed; generated Next build directories are excluded from checks.
- Full isolated local suite: 98 files / 786 tests passed using loopback MongoDB 27020 and one worker. Initial preflight found two Team Activity day-boundary regressions under the host timezone and one stale header expectation. Activity filtering now follows the same work-date normalisation as manual entries/timesheets; both integration cases passed, and signing anti-framing headers are covered.
- Runtime npm audit reports zero vulnerabilities after compatible patches/deduplication. Development-only findings remain recorded separately; no forced/breaking auth downgrade.
- Next advisory references: https://github.com/advisories/GHSA-2464-fhr4-w9xw and https://github.com/advisories/GHSA-673q-mjm6-r5xr.

No database/session/customer mutations or mail sends were performed on production for these tests. The three existing workers remain on their prior release; the candidate app dependency audit does not attest to those older worker dependency trees.

## Live release and acceptance

PR [#81](https://github.com/digisol-ae/COEX/pull/81) merged as `0dcaf6ea5f14ecd98397650085840f2ba9249103`. Tested source `202d8f05e2df5e7d84b9098e1bac7ba25f768e41` has exactly the same Git tree as the merge: `7ea2413e22d2053d5974136dd481e807081d98c3`. PR CI [41707632492](https://github.com/digisol-ae/COEX/actions/runs/41707632492) and merged-main CI [41708641435](https://github.com/digisol-ae/COEX/actions/runs/41708641435) passed, including production builds. Server clean install/build passed. Source archive SHA-256 verified at both ends: `eaf8b338aa4a1cc3bc6fb9fae74116194eda8eedce0e06ac64b0aea28733837f` (2,972,516 bytes). The production archive allowlist excludes exports, backups, QA outputs and private project datasets.

Active PM2 `coex-app-native-signing`, id 11/PID 59120, zero restarts, cwd `/srv/coex/releases/native-signing-20261104/apps/web`, listens only on `127.0.0.1:3009`. Actual process executable is Node 22.23.4; installed Next.js is 16.4.5. RELEASE.json records source, merge, archive, CI, port and cutover. All four app vhosts now proxy to 3009. Apache configtest passed and graceful reload completed; PM2 saved. Customer Resources on 3008 remains healthy immediate rollback. Mail/desk-close/channels kept PIDs 906/907/908, zero restarts. Existing osTicket and other slots were untouched.

The existing canonical URL, database/auth/signing configuration, absolute shared storage and build server-action key were preserved. Prior hashed static assets were copied without overwriting candidate assets. Anonymous candidate/live checks verified login, privacy/terms, invalid signing-link refusal and invalid receipt 404. Signing responses have no-store, no-referrer and anti-framing headers. Protected signing/resource/settings pages redirect anonymous callers to sign-in. Twenty public HTTPS login samples passed after cutover; eleven live hashed static assets matched candidate bytes. Candidate error log was empty at final process verification.

Authenticated live browser acceptance verified the Contracts → Signature tracking entry, the empty ledger and status filters in Asia/Dubai, and Setup → Tenant settings → Contract letterhead fields. A live contract signature screen correctly disabled sending while its contact, reviewed draft and configured letterhead were absent. The existing Customer Resources library/history also rendered after cutover. Production tenant logo/address are blank: configure real letterhead before sending; no business identity/address was invented. Local screenshot: `outputs/qa/native-signing-release-20261104/live-tracking.png` (kept locally). Real customer invitation delivery/signing and physical touch/stylus acceptance remain pilot checks; local synthetic flow coverage does not establish delivery or certificate-backed assurance. No customer email, production signature, contract edit, migration, account/password/session change or session expiry was performed for release acceptance.

## Immediate rollback

First verify `http://127.0.0.1:3008/login` returns 200. Restore all four `worktello.conf.before`, `worktello-le-ssl.conf.before`, `coex.conf.before` and `coex-le-ssl.conf.before` snapshots from `/srv/coex/shared/backups/native-signing-20261104/` into their canonical `/etc/apache2/sites-available/` paths. Run `sudo apache2ctl configtest`, then `sudo apache2ctl graceful`; verify public HTTPS and authenticated navigation. Keep both web slots, shared data, encryption keys and workers intact. Do not restore the database or expire sessions for an application rollback. Documentation-only follow-up requires no rebuild/restart.

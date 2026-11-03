# Native contract signing release — 4 November 2026

Status: release preparation; production traffic remains on Customer Resources port 3008.

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

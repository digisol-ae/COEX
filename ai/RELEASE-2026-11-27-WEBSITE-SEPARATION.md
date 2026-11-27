# Independent public website live — 27 November 2026

## Final website illustration correction — 13:10 PKT / 08:10 UTC

The final live website is `/srv/coex/releases/public-website-20261127-81d3ca0`, PM2
`worktello-public-website-style-20261127` id37/PID1009034, loopback **3025**. Website PR
[#1](https://github.com/digisol-ae/worktello-website/pull/1) merged as `f68b0d0`; its runtime
files match candidate81d3ca0. App3023/id36 and workers are unchanged. Prior website3024/id35
is retained as website-only rollback; combined-app3022 remains full rollback.

Final inspection found the extracted Figma illustration components depended on Tailwind utilities,
which were omitted from the initial standalone package. Restored Tailwind/PostCSS without changing
the design, and added a production generated-CSS check for essential positioning/display utilities.
This omission was corrected before final handoff; initial visual acceptance below did not establish
correct internal illustration layering. Local dark/light toggle and computed layer positioning now
pass; live owner iframe confirms absolute/contents styles, desktop and390px mobile preview.

Website boundary tests/typecheck/build, generated CSS verification, PR CI
[45963261452](https://github.com/digisol-ae/worktello-website/actions/runs/45963261452) and main CI
[45963463820](https://github.com/digisol-ae/worktello-website/actions/runs/45963463820) passed.
A separate server candidate build/CSS check passed. Website-only cutover passed Apache configtest,
10 HTTPS login/landing sample pairs,9 static assets, private preview denial and actual served CSS
positioning/display checks. PM2 saved, final website online with zero restarts.

Correction evidence and original3024 proxy files:
`/srv/coex/shared/backups/website-style-20261127`. To roll back only this correction, verify3024,
restore these four `*.conf.before` files, configtest/graceful, verify HTTPS and save PM2.
No app rebuild/restart, content mutation, session reset or worker change. The developer source ZIP
was refreshed from f68b0d0 and includes the required illustration build. Earlier3024 statements
below document the initial separation; **3025 is current**.


Cutover completed at **12:58 PKT / 07:58 UTC**. Application PR [#103](https://github.com/digisol-ae/COEX/pull/103) merged as `ba06092bd296a448673f7d5a58faa6ff4ae88f5b`; candidate source `6ece330` matches the merged application tree. The original supplied landing design is retained.

## Ownership and developer handoff

Website source is a clean independent private repository, [digisol-ae/worktello-website](https://github.com/digisol-ae/worktello-website), with no COEX history, app services, database models or real environment files. Runtime source `df71780` matches the `src`, `public`, configuration and dependencies at current website main `aa50023` (later commits add review ownership/documentation only). Local checkout: `/Volumes/sd-mac/Developer/DigiSol/worktello-website`. A reviewed website-only handoff archive is `/Volumes/sd-mac/Developer/DigiSol/worktello-website-source.zip`.

Only digisol-ae is a collaborator. GitHub returned403 requiring Pro for private branch protection. CODEOWNERS declares ownership but cannot enforce review on this plan. Keep this repository owner-only and give a developer the clean source bundle; review/import their patch before release. Do not grant direct write access until enforced review is available. No subscription was purchased, developer invited, or automatic production deployment installed.

COEX itself was found PUBLIC. The owner was asked separately whether to make it private; no answer was received and visibility was not changed. A private website repo cannot hide an already-public app. This remains a separate owner decision.

Developer workflow, API contract and access limits: [WEBSITE-DEVELOPER-ACCESS.md](../docs/WEBSITE-DEVELOPER-ACCESS.md). The website README contains dependency installation, local no-account preview, animation locations and reduced-motion/responsive guidance.

## Runtime and routing

- Website: `/srv/coex/releases/public-website-20261127-df71780`, PM2 `worktello-public-website-20261127` id35, loopback **3024**.
- Application: `/srv/coex/releases/website-contract-20261127-6ece330`, PM2 `coex-app-website-contract-20261127` id36, loopback **3023**.
- Node22.23.4; both processes online with zero restarts at acceptance. PM2 saved.
- Previous application id31/3022 remains online as immediate rollback. Older3021/3020 remain unchanged.
- Workers27/28/29 retain PIDs927635/927636/927642 and zero restarts. Database, settings, sessions, storage and credentials are unchanged.
- The website environment contains no app database/auth/storage/encryption keys. Only the fixed loopback app origin is configured. The application uses its existing environment-loading launcher and shared environment symlink.
- All four Apache Worktello/COEX vhosts route exact `/` and `/website-preview` to3024; `/website/` assets and `/marketing/_next/static/` also go to3024, stripping `/marketing` only for static chunks. All other paths, including APIs, media, login, register, policies, owner manager and `/_next/`, go to3023. Existing forwarded-IP/header hardening is preserved. No DNS, TLS or public-listening-port change.

Future app cutovers must update the website process's fixed `WEBSITE_APP_ORIGIN` to the selected app loopback port and verify v1 compatibility. Future website-only releases can replace the website process/routes without rebuilding the app. Keep v1 compatible during staggered upgrades.

## Privacy and behavior

Public v1 content contains published data or null plus authoritative trial/storage defaults. Session entry returns only whitelisted destination, with no user/tenant identity. Private preview calls the existing `websiteEditor` stored active platform_admin guard before either draft or published preview; forged contexts and tenant administrators cannot obtain access. Private responses and website pages are no-store; the public DTO is also no-store. Only one validated opaque session cookie is forwarded to the fixed app origin, with redirects disabled and a timeout. No private request falls back to public content or fixtures.

Public and private preview use the same separate website renderer. The manager's same-origin iframe/message checks still apply. Cross-runtime navigation uses plain anchors. Website images are unoptimized; protected uploads stay behind app publication/owner checks. No production website save, publish, restore, upload, account creation or session creation was submitted for QA.

## Validation

- 497 application unit tests,14 isolated MongoDB CMS regression tests and4 independent website boundary tests passed (515 total).
- App typecheck/lint/format and supported local webpack build passed. Local Turbopack CSS-worker binding was denied even with escalation; normal production Turbopack builds passed in CI and on the VPS. No source workaround was introduced.
- Application PR CI [45960963938](https://github.com/digisol-ae/COEX/actions/runs/45960963938) and merged-main CI [45961564274](https://github.com/digisol-ae/COEX/actions/runs/45961564274) passed. Website initial CI [45960770994](https://github.com/digisol-ae/worktello-website/actions/runs/45960770994) and final source/docs CI [45961519604](https://github.com/digisol-ae/worktello-website/actions/runs/45961519604) passed.
- Both server candidate builds passed. Candidate HTTP acceptance checked DTO field allowlist, authoritative defaults, anonymous preview401/no-store, identity-free session entry, landing200 and9 static files.
- Read-only real stored-role acceptance allowed an existing active owner for draft and published preview and denied a real active non-owner with forged owner context for both modes. Public DTO fields were checked; no production fixtures or data mutations.
- Final cutover: Apache configtest/graceful passed,10 login/landing HTTPS sample pairs returned200, all9 website chunks returned200, anonymous preview redirected to login/no-store and its API returned401. Missing-media404 passed. Latest login sample0.095s.
- Existing live owner browser session rendered the separate manager and independent desktop/mobile iframe. Homepage redirected that session to dashboard; manager reloaded successfully afterward. No broader signed-in business-flow acceptance is claimed. Client-contact/workspace-status destinations are covered by unit tests, not new live sessions.
- Local browser checked public desktop/mobile layout and FAQ expansion. Existing final upload chooser limitation from26November remains: no new browser upload acceptance was attempted.

## Deployment corrections and rollback

Initial candidate startup used a PM2 filename that was treated as a script and then bypassed the app environment launcher. Both candidate-only configuration errors were corrected before live traffic changed; mistaken config-file processes were removed. The final processes use recognized `ecosystem.config.cjs` files.

The first proxy attempt returned308 because Apache appends the original path when ProxyPassMatch has no backreference. Automated verification restored all original vhosts immediately. The final rules use fixed-host exact captures `^(/)$` and `^(/website-preview)$` with `$1`; second cutover passed all checks. See [Apache ProxyPassMatch documentation](https://httpd.apache.org/docs/2.4/en/mod/mod_proxy.html#proxypassmatch).

Private release evidence: `/srv/coex/shared/backups/website-separation-20261127` includes original/final four vhosts, private PM2 snapshot, committed source archives, install/build logs, read-only verification scripts and cutover.json. No new database dump/restore is claimed for this read-only contract release; previous protected backups remain intact.

Rollback: verify3022/login200, restore the four `*.conf.before` files from this backup to sites-available, run Apache configtest then graceful reload, verify HTTPS landing/login/owner manager, and save PM2. That restores all traffic to the former combined application. Do not restore the database, reset sessions or touch workers. Keep3023/3024 until rollback is confirmed. Website-only rollback selects the prior website release; app contract compatibility must be retained.

Local website preview and the owned isolated MongoDB container were stopped after QA; retained source/test data remain available. Leave the Mac running.

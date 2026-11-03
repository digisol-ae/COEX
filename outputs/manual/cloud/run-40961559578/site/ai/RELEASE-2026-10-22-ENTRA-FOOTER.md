# Microsoft return URLs and DigiSol attribution — deployed 22 October 2026

## Result and files

PR #36: https://github.com/digisol-ae/COEX/pull/36 merged as f266afe451f3881ffd6ef707b121b0deba0a705f. PR CI https://github.com/digisol-ae/COEX/actions/runs/39806601526 and merged-main CI https://github.com/digisol-ae/COEX/actions/runs/39807108288 passed.

- `apps/web/src/modules/core/services/entra.service.ts`: configured-origin return URL helper; callback/start routes use it for success and errors. Request listener origin no longer leaks into redirects. Existing state/PKCE/nonce/session checks retained; external destination inputs rejected.
- `apps/web/src/app/login/auth-shell.tsx`: TypeScript/JSX shared login/recovery layout. “Powered by DigiSol” with actual transparent logo beneath, replacing visible company text; desktop rail and mobile/tablet footer. Existing security widget gets enough width at 320px through smaller gutters; security behavior unchanged.
- `apps/web/public/brand/logo-long.png`: existing 3671×1240 DigiSol asset reused at 96px proportional width. Product Coex branding unchanged. Policies retain Digisol LLC-FZ and info@digisol.ae.
- `tests/unit/entra-redirect.test.ts`: eight regressions covering successful public redirect/session cookie, account denial, validation error, cancellation, configured local3106, blank AUTH_URL fallback, unconfigured start and external destination denial.
- Release notes retain existing maintenance acknowledgement ID; generic “3 bug fixes and 1 improvement.” No branding announcement.

## Validation

Fresh local and isolated server builds passed (71 pages). Focused lint/typecheck and eight redirect tests passed; GitHub checks passed before traffic switch. Local browser emulation at 320/768/1440px and DPR1/2: one loaded 96px DigiSol footer, no horizontal overflow; 320/1440 screenshots inspected. These are desktop browser emulations, not physical device acceptance.

Production login 200 contains attribution and logo. Downloaded public logo matches local SHA256 `702cccc8da4540fc45249039e128d7287c3135e2a26380a34d14099a69bbae75`. Public privacy/terms 200 retain legal identity. Before fix, cancelled callback returned localhost3002; after fix, `/api/auth/entra/callback?error=access_denied` returns 307 to `https://coex.digisol.ae/login?entra=cancelled`.

Live browser QA also passed all six viewport/DPR combinations after waiting for public styles/assets to load; live 320px screenshot inspected.

No actual Microsoft interactive sign-in performed by automation: successful authentication/session path is mocked in regression tests; live cancelled callback and private configured dashboard URL verified. Local ignored AUTH_URL currently uses port3100 while preview is3106; actual local OAuth needs a matching configured/registered origin. No registration/secrets changed. No real task/email/tutorial publication.

## Runtime and rollback

Active blue `coex-app` id7 / PID184237, loopback3001, `/srv/coex/releases/entra-redirect-20261022`, source f266afe451f3881ffd6ef707b121b0deba0a705f. Build tree matches final feature a1e856a before merge. Apache canonical COEX HTTP/HTTPS vhosts now target3001. Green `coex-app-green` id6 / PID181724, port3002, `/srv/coex/releases/tutorial-origin-20261022` is warm fallback. Former blue id5 retired only while green served traffic. Workers unchanged: mail159658, desk-close159673, channels159698, exactly once each; five intentional PM2 entries saved.

Fresh backups: `/srv/coex/shared/backups/coex-2026-10-22-1938.archive.gz` and `files-2026-10-22-1938.tar.gz`. Action encryption compatibility privately retained and prior static chunks copied. Apache snapshots `/srv/coex/shared/apache-before-entra-20261022194406/`. All 40 HTTPS monitor samples returned200 (`/tmp/coex-entra-switch-20261022194406.log`), bounded availability evidence. Roll back mappings3001→3002 in both canonical vhosts only after checking green login200; configtest and graceful reload, then public verification. Do not restart workers.

Owner-authorized session expiry: three existing COEX-tenant sessions revoked after healthy switch, cutoff `2026-10-22T15:44:07Z`; post-cutoff logins excluded; read-only verification found zero old unexpired sessions remaining. Guards require sign-in on next protected request/navigation; no immediate client redirect or unsaved-draft preservation claim. Documentation-only follow-up needs no rebuild, restart or repeated session expiry. Unrelated projects/ preserved.

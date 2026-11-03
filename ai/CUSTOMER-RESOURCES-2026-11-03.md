# Customer resources continuation

## Customer Resources — 3 November 2026 (draft PR #79, not deployed)

Implemented and committed as `b74abf82ee8a6f70d33ea58cee5874a8fb320459` on `codex/customer-resources`, pushed for review at https://github.com/digisol-ae/COEX/pull/79. Source is isolated at `/Volumes/sd-mac/Developer/DigiSol/worktello-show-more-live`; do not assume this older mixed checkout contains the new feature or pull over its unrelated edits.

Approved behavior: reusable tutorial documents/video links, email or customer-ticket sharing, no account sign-in, single-use OTP emailed with the link, customizable expiry default 72 hours, and same-browser access until expiry/revocation. Customer library, PDF preview/download, permission/customer/tenant checks, history and revocation implemented. Local types/lint/format, 455 unit tests, 20 focused Mongo/email tests, production build and portable-manual validation passed. Browser upload, sharing, PDF/download, custom 24-hour ticket share, repeat access, revocation and phone layout passed with synthetic local data. Real email delivery, live customer upload and deployment have not occurred. GitHub CI run `41601701297` passed on the draft PR. Review preview is http://localhost:3123/support/resources; no mail worker is running for its dedicated `worktello_resources_local` database on local Mongo 27020.

Definitive feature and QA guides are in the isolated checkout: `docs/CUSTOMER-RESOURCES.md` and `docs/qa/CUSTOMER-RESOURCES-2026-11-03.md`. PR includes updated task/state/handoff notes and the manual. Current primary worktree modifications, project planning, exports and backups were preserved.


Additional final verification: built production-mode preview on local port 3124 rendered the protected PDF successfully with its bundled worker; this is not a production deployment. Screenshot: `outputs/qa/customer-resources-20261103/production-bundle-preview.jpg`. Temporary production-mode listener is stopped; development preview remains on 3123.

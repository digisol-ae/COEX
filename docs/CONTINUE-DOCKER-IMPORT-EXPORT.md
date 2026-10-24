# COEX Docker import/export handoff

> Release update 25 October 2026: completed implementation shipped in application 4701314. Historical local-only/pending statements below are superseded by `ai/RELEASE-2026-10-25.md`; QA limitations remain explicit there. Teams catalog 1.2.0 and real Teams web SSO/list reads verified; no production write-flow acceptance claimed.

Completed after the requested restart on 23 October 2026.

Docker and COEX are running on localhost:3110. Old host servers on 3104, 3106
and 3107 remain stopped. Source changes and all synthetic QA data are saved on
sd-mac; unrelated FEEDBACK.md and projects/ are preserved.

Import/export for six modules is implemented under Setup: tasks, tickets,
customers, leads, products and contracts. Read docs/DATA-TRANSFER.md for the
create-only behavior, field coverage, limits, permission rules and exclusions.

Completed verification: full optimized production build, TypeScript, focused
lint, 24 CSV/permissions/navigation unit tests, fresh six-module database
creation/export/replay checks, preview no-write, invalid-file blocking, lock
contention, permission denials on a real synthetic account, cross-tenant
references, personal-task privacy and internal-ticket privacy. Browser upload,
preview, creation, exports and template downloads passed for all six modules;
invalid task CSV blocked import. Downloaded contents were independently checked.

No commit, push or production deployment was made. There is no unfinished
build check from the pre-restart pause.

Evidence: /Volumes/sd-mac/Developer/Docker/logs/coex-transfer-production-build-resume.log,
/Volumes/sd-mac/Developer/Docker/logs/coex-import-export-final.jpg, and
CSV artifacts in /Volumes/sd-mac/Developer/Docker/exports/.

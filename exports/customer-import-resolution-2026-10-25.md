# Live customer import — 25 October 2026

Confirmed live application 76cac60 in /srv/coex/releases/copilot-pilot-20261025, active PM2 coex-app id14. The shared release .env points to /srv/coex/app/.env. AUTH_SECRET was absent; COEX_ENCRYPTION_KEY was already configured. Docker config supplies an import secret, explaining the environment gap.

Backed up environment privately to /srv/coex/shared/backups/env-before-customer-import-20261025T092122Z (mode600). Added a cryptographically random AUTH_SECRET without exposing its value or changing existing encryption material. Restarted active web only: PID329947 ->335509; loopback login returned200 and PM2 state saved. Worker PIDs303634/303723/303820 and fallback318054 unchanged, all online.

Original124-row CSV preserved. Separate normalized file converts Client to client, explicit country names to two-letter codes, and bare website domains to https URLs. Live preview111 ready/13 matching duplicates/0errors. Actual authorized customer import completed111 created/13 skipped/0errors. Browser result and screenshot saved alongside this record. Skipped rows CSV retained for review; matches include shared email addresses and do not necessarily imply identical businesses. No existing customer updated.

Remaining release-process improvement: require configured import secret during deployment preflight and verify authenticated live preview after rollout. No source change, commit or push was needed for this environment repair. Warm fallback reads the shared environment on its next restart; its running process was not restarted or import-tested.

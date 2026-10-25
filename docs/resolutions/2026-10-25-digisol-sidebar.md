# DigiSol sidebar identity — 25 October 2026

The expanded desktop sidebar and mobile navigation panel now show the existing DigiSol wordmark rendered black. The narrow icon rail and mobile rail retain the Worktello W. Other product/authentication branding is unchanged. The existing transparent master /brand/logo-long.png is reused with a CSS brightness filter, preserving its artwork and aspect ratio; dark mode uses its inverse for contrast.

Validation: focused formatting, workspace types, lint and CI build; live browser/runtime evidence follows deployment. This is a presentation-only change with no database migration or worker restart.

## DigiSol sidebar logo live — 25 October 2026

Expanded desktop/mobile menu headers use the existing DigiSol artwork; narrow rail keeps Worktello W. PR55 merge6567610 and theme correction PR56 merge eeb0c6c1094de8d2656910f2d156836a02d89a93; compiled final application tree6a82d01. Active blue coex-app id18/PID362319 on3001 in /srv/coex/releases/digisol-sidebar-20261025. Canonical Apache proxies target3001; PM2 saved. Explicit Node22.23.4 verified for actual Node descendants. Green17/PID356977 on3002 remains rollback. Workers10/11/12 retain their PIDs and zero restarts.

PR and merged-main CI passed, 402 tests, workspace types and focused lint/format passed; server build passed. Twenty final HTTPS samples returned200. Visual QA caught OS/app theme mismatch in the first candidate; traffic returned to green, then correction rebuilt and passed fresh CI before final switch. Final CSS uses html data-theme rather than prefers-color-scheme. Authenticated live screenshot verifies DigiSol and retained W in app dark theme; black default/light and app-dark inverse compiled CSS rules verified. A separate light-theme visual interaction and native mobile menu were not exercised. Original user tab preserved. Private screenshot: exports/osticket_db/digisol-sidebar-live.png.

Rollback: verify3002/login healthy, restore http-before.conf and https-before.conf from /srv/coex/shared/backups/digisol-sidebar-20261025 to canonical vhosts, apache configtest and graceful reload. Preserve database/workers. Private PM2 environment snapshots must not be published. Documentation-only updates need no restart.

# Worktello domain and support moved page — 27 October 2026

Documentation review of the 26 October release records; no new live acceptance.

## Problem and change

Customers needed a canonical Worktello address and guidance from the old portal. Product and legacy support addresses needed coordinated routing. Canonical worktello.com, legacy compatibility routes and static support moved page.

## Evidence and limits

PR66 merge 99b2c01 and PR67 merge fb2e9d1; recorded release handover only, no fresh runtime check.

Sources: [current task](../../ai/CURRENT_TASK.md), [handover](../../ai/HANDOFF.md). These are historical operator records, not a current server observation.

Latest recorded slot: footer-20261026 on green port 3002; blue 3001 retained as rollback. worktello and coex vhosts target 3002 per handover. The older domain-change entry targeting 3001 is superseded by the footer entry. support.digisolteam.com serves a static moved page linking to worktello.com/login. Legacy /api/integrations/, /integrations/ and /_next/ routes are retained; Copilot re-registration was dropped by the owner. Teams package 1.4.1 is recorded published. No fresh Teams-client or DNS/certificate validation was performed here.

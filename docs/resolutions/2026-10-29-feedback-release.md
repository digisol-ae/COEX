# Feedback release documentation — 29 October 2026

Reviewed merged main through `4eb7f03`: PR70 (`515649d`) ships feedback updates and PR71 records deployment. Source of verification: [release handover](../../ai/RELEASE-2026-10-28-FEEDBACK.md). This documentation run made no runtime check or application change.

## Behavior documented

Historic contract start dates, contacts from ticket people, latest recorded staff activity, Gantt subtasks/PDF, cumulative 10-record display windows and separate staff/customer account controls are included. Existing personal Outlook workspace documentation remains; the new email-to-task add-in is explicitly awaiting native acceptance. Account/query, prefetch and refresh reductions are recorded optimization work, not proof that production freezes are resolved. Most staff display windows still receive existing full service results.

## Recorded verification and open limits

PR/main CI, 441 unit tests and local/server builds passed. Isolated database verification under Asia/Dubai recorded 265 passed and one known unrelated omitted-billable expectation failure. Public checks recorded login/task pane 200 and unauthenticated API 401. Authenticated production workflows were not tested; native Outlook sideloading, real email/attachment transfer and team freeze resolution remain unverified. Earlier local QA notes must not be treated as live acceptance.

## Operational handover

The release record identifies feedback port 3004 with warm rollback slots 3002/3001 and unchanged workers. These are dated handover facts, not current runtime findings. Use its rollback instructions only after confirming current slot health. No deployment, restart, session expiry, business write or private evidence publication occurred during this manual update.

Cloud AI drafting and review-publication acceptance remains unverified. Keep the local midnight writer active.

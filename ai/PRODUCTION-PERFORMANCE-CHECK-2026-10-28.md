# Production hanging report — read-only investigation, 28 October 2026

## User report and scope

Team members report Worktello hanging on almost every task; the owner reports it looks normal on their own computer. User asked to check the production server. No restart, deployment, traffic switch, session revocation, customer/staff account change or business-record mutation was performed. Existing local feature work is separate and remains undeployed.

## Verified active production

- Host: existing Worktello VPS, checked through SSH.
- Apache canonical Worktello vhosts target 127.0.0.1:3002.
- Active PM2 `coex-app-green` id23, wrapper PID403807, actual Next server PID403835.
- Active release: `/srv/coex/releases/footer-20261026`; RELEASE.json sourceCommit `7e32b8b9f4f2677c584a5602ec26713e7f9390a6`, candidatePort3002, previousPort3001.
- Blue rollback `coex-app` id22 on3001; old osTicket app on3003; workers remain running. Active app restart count zero, uptime about two days. PM2's wrapper RSS/loop metrics are not the actual Next process's metrics; OS process RSS was checked separately.

## Current health evidence

Initial check at 06:54 UTC / 11:54 Asia/Karachi on 28 October:

- 6 CPU cores, load about3.1; sampled CPU idle78–88%, IO wait2–8%.
- RAM total11960MB, available8012MB; actual active Next server RSS about868MB. No swap configured, no observed memory exhaustion.
- Root disk30% used,137GB free.
- App/worker processes online; no recent app restarts or sampled kernel OOM/I/O errors.
- Public HTTPS login returned200 in1.28s, including network/TLS from this machine.
- Five internal active-app login checks returned200, first-byte19–60ms. An earlier first check was182ms. Blue first check1.06s does not describe the active traffic target.
- Production database connection164ms; ping samples5,11,17ms. Database is remote, not the VPS's local mongod. No URI/credential printed.
- Database serverStatus/currentOp commands were denied by the existing app account. No permissions were changed to bypass that restriction. Therefore database-wide contention/slow-operation absence is not established.
- Apache server-status is not available through the checked default local URL; no change to enable it.14 Apache processes observed, configured MaxRequestWorkers150. Access logs use combined format without per-request duration, so historical latency percentiles cannot be reconstructed from them.

## Application and traffic findings

Recent30-minute sample:4400 requests,3745 RSC requests, about53.4MB response bytes;4386 HTTP200,3 HTTP301,11 HTTP304, no5xx in that sample. Clients were counted using hashes of network addresses; these represent network addresses/NATs, not necessarily individual computers. Do not equate a client hash with one teammate.

Tickets carried the largest repeated payloads. In a separate two-hour ticket sample:

- All/search view:56 requests, median about1027KB and max1044KB;45 responses over250KB.
- Default Tickets:852 requests, max646KB;181 over250KB. Many smaller RSC responses are prefetch/shell data, so raw request counts alone do not prove overload.

Deployed source confirms:

- `tasks/[id]/page.tsx` calls listUsers without restricting customer-contact accounts; listUsers returns all432 accounts in this tenant, consisting of12 staff accounts and420 client_contact accounts. Task owner/origin choices consequently receive unnecessarily broad account data. This is a confirmed inefficiency, not yet proven to be the cause of the reported freezes.
- LiveRefresh uses router.refresh every15seconds while visible/not typing. It runs on several views and may compound prefetch/render work. The full task-detail page itself does not mount LiveRefresh; do not claim every task detail automatically refreshes every15seconds.
- Tickets page retrieves customer choices using listOrganisations, which performs118 contact counts and118 site counts for118 customers. This unnecessary work repeats on page loads/refreshes.

Read service timings from the deployed release, printing only counts/durations:

- Open ticket list:23 records,118ms,16KB JSON.
- Queue choices:4 records,114ms.
- User choices:432 records,242ms,101KB JSON.
- Customer choices:118 records,606ms,236 per-customer count queries plus customer read.
- Collaborator choices:116 records,161ms,10KB JSON.
- Ticket count5046 (metadata count, no ticket bodies printed).
- Sample task read: platform admin91ms; agent45ms. Additional sampled task-stage reads were11–258ms for admin and16–212ms for agent;4 comment records. No role-specific backend stall reproduced. These were service reads, not a complete authenticated HTTP render or browser main-thread profile, and cover one representative task only.

Profiling note: the first fresh Mongoose diagnostic process initialized models and issued automatic createIndex checks (normally idempotent for existing indexes). No explicit index alteration was requested and no business records were written. Subsequent task profiling explicitly disabled autoIndex and autoCreate before importing models. Do not describe the initial service profile as a guarantee that no metadata command was issued.

## Error evidence

- Worktello Apache log contains upstream reset/read failures around09:56–09:58 server/Dubai time, equivalent to10:56–10:58 Asia/Karachi; one affected path was/api/tutorials. This establishes earlier connection errors, not the cause of the task freezes.
- Current PM2 error log also contains malformed Server Action/FormData requests and at least one valid-format action-reference mismatch. It lacks reliable per-entry timestamps, and includes bundled code text, so naive substring counts overstate unique errors. These cannot confidently be correlated with the current reports or attributed to normal users rather than scanners/stale clients.

## Assessment and next diagnostic step

No sustained host resource shortage or current app outage found. Root cause of the team-only hangs remains unconfirmed. Confirmed account-choice overfetching, unnecessary repeated customer counts, larger Tickets payloads and background loading are optimization targets. None has been deployed or changed during this check.

Ask one affected teammate to do a hard refresh (Ctrl+Shift+R), then reproduce on the same task. Capture the exact task, time and whether the request remains pending, navigation is slow, or the browser UI stops responding. A comparison in a private window and a browser Performance/Network trace on an affected machine will distinguish stale-tab state, client CPU/memory/extension issues and request/server latency. Do not infer that all team computers have the same cause solely because the owner's computer is unaffected.

Potential repair scope once authorized: restrict task/staff pickers to active staff while preserving historical assignee labels; load large chooser data on demand; replace per-customer count reads with batched counts; prevent overlapping refreshes and reduce unnecessary prefetch. Preserve permissions, customer boundaries and current production release until a reviewed candidate is ready.

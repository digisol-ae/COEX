# Space Board and activity controls — 30 October 2026

Reviewed merged PR73/74/76/77 through `2312c21`. PR73 adds sortable, collapsible Team Activity Summary, compact time/share controls and user-opened What’s New. [UI handover](../../ai/RELEASE-2026-10-29-UI-IMPROVEMENTS.md) records CI/build and public smoke checks, without authenticated UI acceptance for that release.

PR76 preserves expanded Space windows after edits and reveals newly created tasks. PR77 applies independent ten-task windows to each Board status column. The recorded signed-in live check expanded Done from 10 to 20 while To do remained 5. Creation, editing, moving and filter resets were checked with isolated synthetic data; no production task writes were performed. The narrow viewport timer overlapped the far-right footer button; keyboard activation passed, local pointer expansion passed. This limitation remains open.

[Show more handover](../../ai/RELEASE-2026-10-29-SHOW-MORE.md) and [Board handover](../../ai/RELEASE-2026-10-29-BOARD-COLUMNS.md) record deployment, CI, backups and rollback. The latter records port 3007 and unchanged workers. These are historical handover claims, not a current runtime inspection. No application, production, session or business-data action occurred in this documentation run.

Open documentation PR75 describes an earlier held 3005 cutover and conflicts with later release evidence. Do not merge it unchanged. Native Outlook acceptance, freeze resolution and authenticated cloud AI drafting/review publication remain unverified; keep the local writer active. The UI handover also records an unresolved dependency-security follow-up; this documentation run did not assess or remediate it.

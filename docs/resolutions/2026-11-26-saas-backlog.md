# SaaS launch and older feedback follow-up

Status: deployed through PR #97, merged as 13286bd. The web and all three workers use source f26c824 on loopback 3020. Payments remain excluded. See ../../ai/RELEASE-2026-11-26-BACKLOG.md for runtime, backup and rollback evidence.

Task and ticket edit dialogs change Save to Close only after a successful save. Editing returns
the button to Save; an edit made during a pending save cannot be marked saved by the older
submission. Close dismisses the dialog without resubmitting. Synthetic browser QA covered the
task and ticket flow and found/fixed native form reset of controlled selections.

Archived folders retain an exact task snapshot for restoration. Individually archived tasks stay
archived. Legacy folders without a snapshot restore only the folder and explain that their tasks
need separate review. Transactions retain audit and tenant/private boundaries.

Subtasks can be delegated to another eligible staff member without changing the parent owners.
Personal work, badges, My Desk, dashboard and Teams honor the delegated ownership; Space/Folder
membership and active-staff rules still apply. Narrowing membership cannot strand a delegate.

Flagged temporary passwords require the existing recovery flow. Ordinary web/API sessions and
Microsoft/Teams paths cannot bypass that flag. Verified customer email-code access discards a
flagged temporary password. A read-only production count found nine flagged staff (including two platform owners), plus one flagged portal account with verified email-code access that discards its temporary password. John Ali’s old session now reaches login; fresh authenticated acceptance awaits owner recovery. No password/flag bypass was performed.

Lead forms now use the shared native drawer, including Escape/focus behavior and themed controls.
Gantt PDF export accepts the configured public origin behind the reverse proxy and still refuses
foreign origins. Existing ticket-aware timesheet titles and four-level task data were reviewed;
no legacy Space migration was needed by the live counts (27 Spaces, 52 Folders, zero active
project-only/phase-only tasks or tasks missing their Space).

The supplied Figma and original handoff assets power the new signed-out landing page. Template
claims and unapproved testimonials are omitted/corrected as authorized. Signed-in workspace and
customer-portal redirects remain. Desktop/mobile menu, feature, theme and FAQ interactions were
checked; the final asset/visual verification is recorded in the release handoff.

WhatsApp Setup messages can create one unassigned task in an accessible Space. Repeated/concurrent
clicks share one task, with the message link and audit committed together. The service checks
stored actor rights, tenant, module and Personal-space boundaries. It sends no reply or external
media request. Real XVERSE activation still needs the vendor API contract.

Storage reconciliation uses a shared-disk writer/maintenance handshake, preview-by-default owner
CLI and transactional audit. It counts all retained files and removes none. See
[operator runbook](../STORAGE-RECONCILIATION.md), including first-rollout and crash-recovery rules.
Offsite attachment archival needs an approved destination; same-disk compression is not capacity
recovery.

The private production backup was restored into an isolated network namespace: 52 collections,
45,287 documents and 484 files / 65,805,848 bytes. The temporary MongoDB port was unreachable from
the host namespace, and the owned sandbox was removed. This verifies this backup restore, not
high availability or recovery from complete VPS loss. The registration test was accepted by SMTP;
recipient inbox receipt remains unconfirmed, and public applications remain closed.

Validation details and remaining dependencies: [completion inventory](../BACKLOG-COMPLETION-2026-11-26.md).

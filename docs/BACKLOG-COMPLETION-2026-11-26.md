# Non-payment backlog completion

Owner authorized all remaining SaaS work and older application feedback on 26 November 2026.
Payments remain explicitly excluded. Test email recipient authorized: ali@digisol.ae. Production
SaaS foundation is already live via PR #94; authenticated owner reads passed. This file tracks
follow-up implementation separately from the deployed source.

## Work queue

| Item                                              | Current finding / next work                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Original task/ticket Save → Close → Save          | Implemented; synthetic browser verified Save → Close → edit → Save and actual dialog dismissal for task and ticket. Controlled form reset corrected after QA.                                                                                                                                                                                  |
| Archived folder restore screen                    | Implemented with transactional snapshot restoration, tenant/private boundaries, audit rollback and conservative legacy-folder handling. Focused tests passed.                                                                                                                                                                                  |
| T9 subtask delegation beyond parent assignees     | Implemented with Space/Folder privacy and staff validation. Personal work, badges, My Desk, dashboard and Teams include delegated owners without changing parent assignees. Regression tests passed.                                                                                                                                           |
| Forced password change                            | Enforced for password/web/API/Entra/Teams; recovery is the existing password-reset flow. Verified customer OTP discards the flagged temporary password. Live impact count: 10 active flagged accounts will need recovery; no passwords changed by this check.                                                                                  |
| Compact Leads, Spaces and settings; Dark controls | Spaces/settings already use shared compact drawers. Lead create/edit/convert/disqualify now use the same native drawer, adding focus/Escape handling and token styling. Synthetic dark drawer and Escape dismissal checked; original QA theme restored.                                                                                        |
| T10 WhatsApp message → task                       | Transactional, idempotent message → task added to authorized Setup message tools; tenant/role/module/private boundaries and audit rollback tested. Broader M6.3–M6.5 roadmap is separate from T10; real XVERSE go-live still requires the missing API contract.                                                                                |
| 50 GB attachment archival                         | No archive destination selected. Need recoverable storage strategy and destination before moving live attachments; monitor can be added independently.                                                                                                                                                                                         |
| SaaS storage reconciliation                       | Implemented shared-disk writer/maintenance handshake, preview-by-default owner CLI and transactional audit. Includes all retained/orphan files, deletes none; concurrency and rollback tests passed. See STORAGE-RECONCILIATION.md. First rollout must replace all old writers before using the tool.                                          |
| Shared object-storage scaling                     | Current deployment is one shared disk. Adapter destination/provider not selected; no provider adoption or purchases assumed.                                                                                                                                                                                                                   |
| Optional trial seat/module/plan defaults          | Commercial definitions are not supplied; existing 30-day/2 GB defaults and owner controls remain. Optional seat/plan defaults stay deferred until definitions are agreed, per SAAS-ROLLOUT.md.                                                                                                                                                 |
| Automatic registration readiness                  | Initial manual approval retained as requested. Future automatic mode remains dormant; no public automatic access enabled.                                                                                                                                                                                                                      |
| Tenant isolation / public link policies           | Audit remaining raw-model and integration boundaries; retain existing link expiry unless an explicit configurable policy is added.                                                                                                                                                                                                             |
| Restore/staging/monitoring                        | Private quiet backup restored in isolated network namespace: 52 collections, 45,287 documents; storage restored: 484 files / 65,805,848 bytes. Restore port unreachable from host namespace. Own restore sandbox removed. Proxy forwarded-IP hardening remains for cutover; monitoring review pending.                                         |
| Registration inbox delivery                       | One authorized test accepted by SMTP (sent, attempt 1). User inbox receipt remains pending. Public registration stays closed.                                                                                                                                                                                                                  |
| Exact team landing page                           | Original team assets and Figma contexts integrated locally; desktop/mobile theme/menu/accordion/FAQ checks passed. Full-page visual and asset audit complete: 105 rendered image nodes, no broken/pending images after scrolling, no container overflow; six scaled illustrations have nonzero dimensions. Bottom CTA text contrast corrected. |
| T1/T2/T3/T4/T5/T6/T7/T8/T11/T12, U1/U2/U3         | Historical notes are stale: implementations exist. Verify coverage/current behavior, consolidate evidence rather than reimplement.                                                                                                                                                                                                             |
| Gantt export                                      | Existing PDF export retained; origin check now accepts the configured public URL behind the reverse proxy while denying foreign origins. Focused route regression passed.                                                                                                                                                                      |
| Four-level migration                              | Read-only live check: 27 Spaces, 52 Folders; zero active tasks missing Space, zero legacy project-only or phase-only tasks. No migration run or required by these checks.                                                                                                                                                                      |
| Timesheet Unknown task on tickets                 | Ticket-aware titles now exist; verify edit form path before closing historical note.                                                                                                                                                                                                                                                           |
| Older “pending/local” release notes               | Reconcile against later release records and current source; do not treat historical acceptance limits as missing features.                                                                                                                                                                                                                     |

No broad production record changes, external provider connection, credential disclosure or pricing
assumptions are authorized by this inventory. The owner authorized implementation/deployment and
one clearly labelled registration email to the named recipient.

## Later owner inputs

- Exact Figma target: file HiWQy9NVMeroOMbVg3Y46M, node 146:762. Existing Figma session
  179416a1-b382-45eb-bb84-da2d73d665ea; high-fidelity child contexts and reference screenshot
  are under /private/tmp/worktello-figma-context. Asset manifest is private there. Public-safe
  inventory: WORKTELLO-LANDING-DESIGN.md. Original handoff:
  /Volumes/sd-mac/Developer/DigiSol/worktello/Worktello Design Handoff/.
- Owner chose to preserve visual design while correcting Rentix/rental/payment template copy
  and omitting unapproved testimonials. Public image files supplied by the team are staged under
  apps/web/public/website/handoff; exact Figma raw assets are under website/figma. Handoff hero
  is bottom-cropped relative to Figma; use Figma layers for exact geometry.
- Owner requested computer shutdown after completion. Save/push work and final handoff first;
  do not shut down while authorized implementation or deployment work is still running.
- Original mixed source contains one missing SaaS route: workspace-status/page.tsx. It is now
  restored in the follow-up tree. Two absent paint-loader files are unrelated branding work,
  deliberately excluded from the SaaS integration.

## Candidate validation

900 tests across 109 files passed against isolated coex_test_* databases. Workspace types, full
ESLint and Webpack production build passed. The subscription session fixture now explicitly models
a user who completed password setup; the new authentication gate correctly refused its old
flagged fixture. A pre-existing render-prop lint false positive is documented at its call site.
Screenshots are under docs/manual/assets/backlog-20261126-*.jpg. No follow-up cutover yet.

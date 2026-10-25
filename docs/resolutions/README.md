# Resolution register

Each resolution records its symptom, confirmed cause, scoped fix, verification and release/rollback limits. Use TEMPLATE.md for the next resolution. Historical summaries link the original evidence rather than inventing new acceptance.

| Date           | Resolution                                                                        | Status                                                                       |
| -------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 25 Oct 2026    | [Expanded ticket search](2026-10-25-ticket-search.md)                             | Live; field/privacy integration and authenticated history search verified    |
| 25 Oct 2026    | [osTicket history and customer activation](2026-10-25-osticket-migration.md)      | Live; migration counts and staff UI verified; real-inbox activation untested |
| 25 Oct 2026    | [Guided imports, match review and contacts](2026-10-25-import-review.md)          | Deployed with PR49; guided-import UI acceptance remains separately scoped    |
| 25 Oct 2026    | [Outlook iframe refused to connect](2026-10-25-outlook-web.md)                    | Deployed; real Outlook web reads verified                                    |
| 23–25 Oct 2026 | [Search popup trapped by the header](2026-10-25-search-popup.md)                  | Deployed; production read checked                                            |
| 24–25 Oct 2026 | [Subtask checkbox/count did not settle correctly](2026-10-25-subtask-checkbox.md) | Deployed; synthetic UI verified                                              |
| 22 Oct 2026    | [Tutorial link save showed Not allowed](2026-10-22-tutorial-origin.md)            | Deployed; write/playback acceptance limited                                  |
| 22–25 Oct 2026 | [Microsoft login returned to localhost](2026-10-22-microsoft-redirect.md)         | Deployed; real sign-in verified                                              |
| 22 Oct 2026    | [Teams assignment email expectations](2026-10-22-assignment-email.md)             | Owner-accepted behavior deployed                                             |
| 25 Oct 2026    | [Patched Node runtime activation](2026-10-25-node-runtime.md)                     | COEX application process trees verified                                      |

Interactive user guide: `../manual/index.html#resolutions`. Secrets and raw private exports must never be included. The initial index covered seven documented resolutions; older release records remain in ai/ and deploy/. Every future fix should add its dated record and update this register.

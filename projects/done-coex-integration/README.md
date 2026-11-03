# dOne ↔ COEX support integration

Project owner: John. Created 18 October 2026.

**Status: planning only. Waiting for the development team to install dOne locally and John to provide access.** No dOne code has been inspected, no integration API is implemented for this project, and no deployment has occurred.

dOne is a separate web application, not Doyen. Its web Support section will connect to COEX so customers can create tickets and follow public conversations without a separate COEX login. Frontend and backend must remain independently maintainable.

## Start here

| Document                                         | Who should read it    | Purpose                                                         |
| ------------------------------------------------ | --------------------- | --------------------------------------------------------------- |
| [Project plan](PLAN.md)                          | Everyone              | Agreed scope, phases and pending decisions                      |
| [API contract outline](API-CONTRACT.md)          | Uzair and Bilal       | Agreement to finalise before implementation                     |
| [Backend handover](BACKEND-UZAIR.md)             | Uzair                 | Identity, permissions and integration responsibilities          |
| [Frontend handover](FRONTEND-BILAL.md)           | Bilal                 | Screens, UI states and mock-driven development                  |
| [Beginner deployment guide](DEPLOYMENT-GUIDE.md) | Deployment teammate   | Practical guide structure; exact commands await stack discovery |
| [Acceptance checklist](ACCEPTANCE.md)            | Developers and tester | Evidence required for completion                                |
| [Current AI task](ai/CURRENT_TASK.md)            | Continuing AI         | Next authorised work                                            |
| [Project state](ai/PROJECT_STATE.md)             | Continuing AI         | Facts and unknowns                                              |
| [Handoff](ai/HANDOFF.md)                         | Continuing AI         | How to resume safely                                            |

COEX source-of-truth links: [product feedback](../../FEEDBACK.md), [main handoff](../../ai/HANDOFF.md), [customer portal](../../docs/CUSTOMER-PORTAL.md), [COEX deployment status](../../deploy/DEPLOYMENT-STATUS.md).

No credentials, private keys or customer exports belong in this folder. Put operational changes in this project's AI files and material COEX status updates in the main AI handoff. Keep product decisions in FEEDBACK.md, linking here for project detail.

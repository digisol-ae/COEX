# Beginner deployment guide — preparation edition

**Not ready to execute.** dOne stack, server and hosting are unknown. This document is the guide's base; exact copy-paste commands will be filled in and rehearsed after access. Do not substitute guessed paths or run COEX deployment commands against dOne.

Deployment means putting the tested frontend and backend on the server customers use. Frontend is what users see; backend authenticates requests and connects securely to COEX. Environment settings tell each service where to connect. A secret is a password-like value that must stay private.

## Who helps you

| Person              | Ask about                                                |
| ------------------- | -------------------------------------------------------- |
| John                | Scope, access and release approval                       |
| Bilal               | Frontend build, page behaviour and public configuration  |
| Uzair               | Backend, authentication, integration settings and logs   |
| Deployment teammate | Follow this guide, record results, stop at failed checks |

## Before starting

- Obtain approved server access and confirm this is staging or production. Staging is the test deployment; production serves real customers.
- Record the approved release/commit, repository locations, frontend/backend versions and server OS.
- Have the actual domains, ports, service names, database/storage locations and backup procedure supplied by developers.
- Have secrets delivered through the approved private channel. Never paste secrets into chat, screenshots, Git or shared documentation.
- Confirm a working backup and the previous release to restore if needed.
- Read every step before running it. A failed prerequisite means stop and ask the named owner.

## Deployment worksheet — developers must complete

| Item                                           | Verified value |
| ---------------------------------------------- | -------------- |
| Environment and server                         | Pending        |
| Frontend repository/path/build command/service | Pending        |
| Backend repository/path/build command/service  | Pending        |
| Runtime/package manager versions               | Pending        |
| Approved release IDs                           | Pending        |
| Domains, DNS owner and HTTPS setup             | Pending        |
| Environment file/secret-store locations        | Pending        |
| COEX base URL and credential provisioning      | Pending        |
| Identity mapping/provisioning procedure        | Pending        |
| Database migration commands and compatibility  | Pending        |
| Health URLs and expected output                | Pending        |
| Log locations and safe collection steps        | Pending        |
| Backup/restore and rollback commands           | Pending        |

## Order of work

1. **Rehearse on staging.** Confirm server and release; take/verify backups. Record who approves continuation.
2. **Prepare configuration.** Uzair supplies backend-only secrets and COEX settings. Bilal identifies public frontend settings and which require a rebuild. Verify URLs and HTTPS.
3. **Deploy backend.** Follow the verified install/build/migration/start procedure. Confirm health and upstream COEX connectivity before continuing. Never clear a shared database to fix an error.
4. **Deploy frontend.** Build against the intended backend URL, start the selected service and check the public site. Do not proceed past a failed build.
5. **Run the full support journey.** Use labelled synthetic data. Sign in to dOne, raise a ticket with an image, see it in COEX, reply as agent, and read the response in dOne. Verify another customer cannot access it.
6. **Check updates and alerts.** Confirm foreground UI updates; separately test browser opt-in, a background notification and opening the correct ticket. Disable Focus/Do Not Disturb during delivery testing.
7. **Approve production release.** John approves the concrete staged result. Repeat the verified procedure using production settings and the same approved versions.
8. **Record completion.** Save deployed release IDs, time, check results and remaining limitations. Keep private credentials out of the report.

## How every final command step will be written

Each step will show: **where to run it**, **exact command**, **what it does**, **expected output**, **how to confirm success**, and **what to do if it fails**. Commands will be grouped by frontend/backend/COEX so the operator cannot confuse services. Terminal output will be sanitised before sharing.

## If something goes wrong

| Symptom                       | First safe action                                                        | Owner                                    |
| ----------------------------- | ------------------------------------------------------------------------ | ---------------------------------------- |
| Build fails                   | Stop; keep error and release version, hide secrets                       | Bilal or Uzair for affected service      |
| Site will not open            | Check documented health/service and HTTPS steps                          | Deployment teammate + affected developer |
| Login works but Support fails | Check backend/COEX health and identity mapping                           | Uzair                                    |
| Duplicate ticket after retry  | Stop repeated submits; capture request ID                                | Uzair                                    |
| Someone else's ticket appears | Stop release and restrict affected integration through approved controls | John + Uzair                             |
| No notification               | Check opt-in, browser/OS permission, Focus and background-tab behaviour  | Bilal                                    |

## Rollback — must be rehearsed before production

Rollback means returning to the previous working release. Developers must supply compatible frontend/backend versions, exact stop/restore/start commands, configuration backup, migration reversal or forward-recovery plan and verification steps. Never assume pulling an older commit reverses database changes. If recovery could lose customer data, stop and obtain John's explicit decision.

## Completion checklist

- [ ] All worksheet fields replaced with verified values.
- [ ] Beginner teammate followed staging steps without undocumented assistance.
- [ ] Expected outputs and common-error instructions corrected from rehearsal.
- [ ] Backup and rollback tested.
- [ ] Frontend, backend and COEX checks passed with recorded evidence.
- [ ] Production release explicitly approved and deployed revisions recorded.

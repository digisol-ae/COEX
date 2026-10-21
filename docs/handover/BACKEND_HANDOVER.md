# COEX Backend Developer Handover

**Owner:** John (Syed Muhammad Jan Ali)
**Last updated:** 8 Oct 2026
**Lives at:** `docs/handover/BACKEND_HANDOVER.md` in the COEX repo (github.com/digisol-ae/COEX)

This is a living document. Update it in the same pull request as any change to data, APIs, jobs, servers or deployment, and add a line to the change log at the bottom.

Companion documents:
* `docs/handover/FRONTEND_HANDOVER.md` for screens and design rules
* COEX Integrations Developer Guide for WhatsApp, email, Microsoft 365, Zoho Books and osTicket
* `CLAUDE.md` in the repo root for decisions log

---

## 1. System at a glance

| Item | Detail |
| --- | --- |
| App | Next.js 16.3.8 (TypeScript), single app serving UI and API, port 3100 |
| Data access | Mongoose 9 |
| Auth | Auth.js (next-auth v5 beta) with Microsoft Entra; Argon2 for local passwords |
| Validation | zod 4 |
| Email | IMAP (imapflow, mailparser) in, nodemailer out |
| Images | sharp (automatic shrinking) |
| Tests | Vitest: `npm run test:unit`, `npm run test:db` |
| Database | MongoDB 8, local on the same VPS, authentication on |
| Process manager | pm2 |
| Web server | Apache, second virtual host beside Zabbix, TLS for coex.digisol.ae |
| Server | Contabo VPS, 4 vCPU, 8 GB RAM, Ubuntu 24.04 |
| Storage | 100 GB on the VPS for attachments; archiving starts at 50 GB |
| Sign in | Microsoft Entra ID (DigiSol app registration owned by John) |
| Live since | 19 Sep 2026; team fully moved from ClickUp and osTicket on 25 Sep 2026 |

**Important:** the same VPS runs DigiSol's **Zabbix** monitoring (nms.digisol.ae). Raheel and Nabeel hold its access. Anything that uses heavy CPU, memory or disk (imports, image processing, reindexing) must be run off peak and must never starve Zabbix.

---

## 2. Core rules

1. **Multi tenant everywhere.** Every document carries `tenantId`, every query filters by it, and every index used by queries starts with it. DigiSol is the first tenant; client tenants come later.
2. **Server side checks.** Never trust the browser for tenant, role or ownership. Check permissions on every API route and server action.
3. **Validate all input** at the edge of the API with a schema (for example zod) before it touches the database.
4. **No third party calls from modules.** Tickets, Tasks and CRM never call WhatsApp, Zoho or Graph directly; they go through the integration layer (see the Integrations guide, section 3).
5. **Users are identified by Entra `oid`,** never by email alone.
6. **Readable code.** A backend developer, a frontend developer and a designer will join; write for them.

---

## 3. Data model overview

Confirm names against the code and correct this table; it is the map new developers will use.

| Area | Main collections | Notes |
| --- | --- | --- |
| Core | tenants, users, roles, notifications | User linked to Entra `oid` |
| Tasks | portfolios, projects, tasks, steps, timeEntries | Terminology: Portfolio, Project, Task, Step |
| Tasks | taskLinks | Microsoft 365 document links; no file storage on tasks |
| Tickets | tickets, ticketMessages, queues, attachments | Tickets and Tasks are directly connected |
| CRM (planned) | contacts, companies, conversations | Contacts shared with Tickets: one collection, never two |
| Integrations | integration_inbox, integration_outbox, integration_log, integration_links, integration_settings | Defined in the Integrations guide |

### Indexing rules

* Every collection: index on `tenantId` plus the fields used for lists and filters.
* Unique index on external ids (WhatsApp message id, Graph message id, Zoho id) per tenant to make imports and webhooks safe to repeat.
* Review slow queries monthly with the MongoDB profiler.

---

## 4. Files and attachments

* Stored on the VPS disk, outside the web root, served only through an authenticated route.
* Images are shrunk automatically on upload (tickets, email, WhatsApp share the same helper).
* Archive policy starts when usage reaches 50 GB of the 100 GB; design the archive job before then.
* Task documents are **not** stored; tasks keep links to Microsoft 365.

---

## 5. Background jobs

Jobs run as separate processes (workers), not inside web requests. Scripts live in `scripts/`.

| Worker | npm script | Purpose | Status |
| --- | --- | --- | --- |
| Email worker | `npm run email:worker` | Reads the helpdesk mailbox and turns mail into tickets | In repo |
| Desk close worker | `npm run desk:worker` | Ticket desk housekeeping (auto close rules) | In repo |
| Channel worker | `npm run channels:worker` | WhatsApp channel inbox and outbox | In repo; M6 suspended |
| Notifications | none yet | Assignment notifications and emails | Next |
| Attachment archive | none yet | Moves old files when disk passes 50 GB | Planned |

Other useful scripts: `seed`, `check:db`, `check:tasks`, `reset:password`, `import:email`, `migrate:spaces`.

---

## 6. Deployment and operations

| Topic | Rule |
| --- | --- |
| Deploy | `deploy/deploy.sh`; full steps in `deploy/DEPLOY.md`, current state in `deploy/DEPLOYMENT-STATUS.md` |
| Web server config | `deploy/apache-coex.conf` (an nginx variant also exists) |
| MongoDB security | `deploy/mongod-security.md` |
| Secrets | In `.env` on the VPS only, loaded by pm2; never committed, never pasted into chat or tickets |
| Backups | `deploy/backup.sh`; DigiSol and its team own and run backups; confirm the schedule covers MongoDB and the attachments folder |
| Logs | pm2 logs for the app; `integration_log` for every external call |
| Monitoring | Add COEX health checks to the existing Zabbix |
| Costs | Anything that costs money, or needs John's Microsoft or GitHub account, is done by John |

---

## 7. Roadmap (backend view)

| Phase | Content | Status |
| --- | --- | --- |
| Phase 1 | Tasks, Projects, Tickets live | Done |
| M6 Channels | WhatsApp via XVERSE, Support and CRM numbers | Suspended 4 Oct 2026 |
| M8 Hardening | Security, performance and reliability pass (list below) | Starts only when John asks |
| Phase 2 | CRM, Contracts (AMC), Payroll, Zoho Books integration | To be planned |

### Suggested M8 hardening list

* [ ] Schema validation on every route and server action
* [ ] Rate limiting on sign in, webhooks and public routes
* [ ] Security headers in Apache (HSTS, content security policy, frame protection)
* [ ] Index review with the profiler; remove unused indexes
* [ ] Error tracking and an admin error page
* [ ] Restore test of a real backup to a spare machine
* [ ] Health endpoint watched by Zabbix
* [ ] Dependency audit and Node version pin
* [ ] Tenant isolation tests: user of tenant A can never read tenant B

---

## 8. Working rules

* Branch per piece of work, pull request into `main`, at least one review.
* Database changes come with a migration script in the repo, never manual edits in production.
* Each pull request that changes data, jobs or deployment updates this document.
* Ask John before adding a paid service or a new external dependency.

---

## 9. To confirm from the repo

* [x] Next.js, Node and data access versions (section 1)
* [x] Auth library (section 1)
* [ ] Actual collection names, to correct section 3 (see `src/modules/*`)
* [ ] Whether production runs under pm2 or the systemd unit `deploy/coex.service`
* [ ] Backup schedule and where backups are kept

---

## 10. Change log

| Date | Change | By |
| --- | --- | --- |
| 8 Oct 2026 | Saved into the local COEX repo; stack, workers and deploy files confirmed from the code | Claude for John |
| 4 Oct 2026 | First version | Claude for John |

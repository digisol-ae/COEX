# COEX Frontend Developer Handover

**Owner:** John (Syed Muhammad Jan Ali)
**Last updated:** 4 Oct 2026
**Lives at:** `docs/handover/FRONTEND_HANDOVER.md` in the COEX repo (github.com/digisol-ae/COEX)

This is a living document. Update it in the same pull request as any change that affects screens, design rules or frontend conventions, and add a line to the change log at the bottom.

Companion documents:
* `docs/handover/BACKEND_HANDOVER.md` for APIs, data and servers
* COEX Integrations Developer Guide for WhatsApp, email, Microsoft 365, Zoho Books and osTicket
* `CLAUDE.md` in the repo root for decisions log

---

## 1. COEX in one page

COEX (short for Coexistence) is DigiSol's own work platform. It replaced ClickUp and osTicket for the DigiSol team on 25 Sep 2026 and runs at **coex.digisol.ae**.

| Item | Detail |
| --- | --- |
| Users today | DigiSol staff, up to ten people |
| Users later | Client companies as separate tenants (multi tenant from day one) |
| Language | English only, in the UI and in all project communication |
| Sign in | Microsoft account (Entra ID), DigiSol staff only for now |
| Live modules | Tasks, Projects, Tickets |
| Next modules | CRM, Contracts (AMC), Payroll, WhatsApp channels |

**Task terminology (use exactly these words in the UI):** Portfolio, Project, Task, Step. Do not use ClickUp words such as Space, Folder, List or Subtask.

**The story behind the logo:** two facing arcs (black and grey) forming a circle with a red dot in the centre, and a lowercase "coex" wordmark. Team and client coexist around the customer. Keep that calm, balanced feel across the whole product.

---

## 2. Getting started

| Step | What to do |
| --- | --- |
| 1 | Ask John for GitHub access to `digisol-ae/COEX` |
| 2 | Clone the repo and read `README.md` and `CLAUDE.md` first |
| 3 | Copy `.env.example` to `.env.local` and ask the backend developer for local values |
| 4 | Install dependencies and run the dev server (commands in `README.md`) |
| 5 | Sign in locally with your DigiSol Microsoft account |

**Never** point a local frontend at the production database.

---

## 3. Design rules

Figma was dropped on 24 Sep 2026. Design happens directly in code, so the code itself must stay easy for a designer and other developers to read.

### Colour

* Use the DigiSol brand colours from the **DigiSol Branding** folder. Define them once as design tokens (CSS variables or the theme config); never hard code a hex value inside a component.
* The overall look is **light and calm**: white and very light grey surfaces, generous spacing, soft borders.
* **Red is used as little as possible.** Allowed: the logo dot, destructive actions (Delete), and genuine errors. Not allowed: badges, headings, decoration, or "urgent" styling that could be shown another way.
* Status colours must also carry a text label or icon, never colour alone.

### Layout and components

* One component per file, named after what it shows (`TicketList`, `TaskTimer`), not how it looks.
* Reuse shared components before creating new ones. If two screens need the same thing, it belongs in the shared components folder.
* Every list, page and panel has four states designed: **loading, empty, error, filled**.
* Desktop first (staff work at desks), but every screen must remain usable on a phone.
* Keyboard accessible: every action reachable by Tab and Enter, visible focus ring.

### Text and formats

| Item | Rule |
| --- | --- |
| Dates | `4 Oct 2026` in lists; full date and time on hover or in details |
| Times | 24 hour clock |
| Durations (time tracking) | `1h 25m` |
| Currency | AED with two decimals, for example `AED 1,250.00` |
| Ticket numbers | Always shown with the prefix, for example `#T10234` |
| Tone | Short, plain English; buttons start with a verb (Assign, Close ticket) |

---

## 4. Screen inventory

Keep this table current. It is the quickest way for a new developer to see what exists.

| Area | Screen | Status | Notes |
| --- | --- | --- | --- |
| Core | Sign in with Microsoft | Live | |
| Tasks | All tasks dashboard | Live | Required from day one for easy visibility across the team |
| Tasks | Portfolio, Project, Task, Step views | Live | Further work is feedback based |
| Tasks | Time tracking (timer and manual entry) | Live | A main feature; treat with care |
| Tasks | Document links | Live | Documents stay in Microsoft 365; tasks hold links only, no file uploads |
| Tickets | Ticket list, ticket detail, reply | Live | Focus area |
| Tickets | Attachments | Live | Images are shrunk automatically |
| Core | Notifications bell (assigned to you) | Next | First step of assignment notifications |
| Admin | Integration errors page | Planned | Lists failed outbound jobs, with a retry button |
| Admin | Integration settings per tenant | Planned | On or off switch per connector |
| Tickets | WhatsApp conversation in ticket | Suspended (M6) | See section 5 |
| CRM | Contacts, companies, conversations | Planned | Includes "Unidentified" WhatsApp contacts |
| Contracts | AMC contracts and renewals | Future | |
| Payroll | Employees, salary runs | Future | |

Not in scope: knowledge base, ClickUp style features beyond the minimum.

---

## 5. Upcoming frontend work in detail

### 5.1 Notifications (next)

* Bell icon in the top bar with unread count.
* Panel lists items newest first: "Ahmed assigned you Task: Renew SSL for client X".
* Clicking an item opens the record and marks it read; "Mark all read" at the top.
* Later the same events also go by email and Teams; the UI does not change for that.

### 5.2 WhatsApp in tickets (when M6 restarts)

* Messages appear in the same ticket thread as email, with a small WhatsApp icon per message.
* Delivery ticks per outbound message: queued, sent, delivered, read, failed (failed shows a retry action).
* **24 hour window:** if the customer's last message is older than 24 hours, the free text box is replaced by a template picker. Show a clear line explaining why ("Customer has not replied in 24 hours, choose a template").
* Template picker shows the template text with its variables filled in before sending.
* Media: image thumbnails, file chips for documents.

### 5.3 CRM screens (planned)

* Contact list with search by name, phone and email.
* Contact page: details, linked company, WhatsApp conversation, open tickets, contracts.
* "Unidentified" contacts filter, with a quick form to complete name and company.

---

## 6. Working rules

* Branch per piece of work, pull request into `main`, at least one review.
* Small pull requests; screenshots of any visual change in the PR description.
* No new UI library or icon set without agreeing it with John.
* Code must be readable by the next person: clear names, short components, a comment wherever the reason is not obvious.
* Update this document in the same PR when you change a screen, a rule or a convention.

---

## 7. To confirm from the repo

These details should be checked against the code and then written into this document by the first frontend developer:

* [ ] Exact Next.js version and whether pages use the App Router throughout
* [ ] Styling approach (Tailwind, CSS modules or other) and where tokens live
* [ ] Shared components folder path
* [ ] How data is fetched (server components, server actions, API routes)
* [ ] Test setup for components, if any

---

## 8. Change log

| Date | Change | By |
| --- | --- | --- |
| 4 Oct 2026 | First version | Claude for John |

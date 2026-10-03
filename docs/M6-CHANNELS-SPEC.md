# M6 Channels: WhatsApp through XVERSE

Status: M6.1 Foundations and M6.2 Support inbound built locally 1 Oct 2026 (not pushed). M6.3 onwards not started.

## 1. Decisions (John, 1 Oct 2026)

| # | Question | Decision |
|---|---|---|
| D1 | Numbers | Two WhatsApp numbers: one for **Support**, one for **CRM**. |
| D2 | Unknown senders | Open the ticket automatically. No review inbox. |
| D3 | Customer notifications | **Ticket received** is sent automatically. Every other notification is optional (configurable). |
| D4 | Connector location | Not yet confirmed whether XVERSE has an inbound webhook and a send API. Build so that **either** case works (section 4). |

Standing rules that still apply: decision 9 (COEX writes events to an outbox, a connector delivers
them); decision 11 (internal notes never reach the customer); mobiles stored in E.164.

## 2. What each number does

**Support number** (tickets)
- Incoming message from a known contact: added to that contact's open WhatsApp ticket if one exists;
  otherwise a new ticket opens in the **WhatsApp Support** queue.
- Unknown number: a new ticket opens with an **Unidentified** contact holding the number and the
  WhatsApp profile name. An agent links it to a contact or creates one; the number is then saved on
  that contact.
- A message arriving on a ticket that is Resolved: reopens it. On a Closed ticket: opens a new ticket
  that references the old one.
- Images, documents, audio and video are saved as ticket attachments.
- Agent replies go back to the customer on WhatsApp. Internal notes never do.

**CRM number** (relationships, not tickets)
- Every message is logged as a WhatsApp activity on the contact and customer timeline.
- A **WhatsApp conversations** inbox lists open CRM conversations, assigned to the customer's
  account owner, or to a CRM team when there is no owner.
- Unknown number: a new contact is created as **Unidentified** and appears in the inbox for someone
  to complete.
- **Send WhatsApp** on a contact page starts a conversation with an approved template.
- A CRM conversation can be turned into a support ticket with one action (it then continues on the
  Support number's rules).

## 3. Outbound rules
- WhatsApp's 24 hour window: free text only within 24 hours of the customer's last message; outside
  it, only an approved template. The reply box shows the window state and switches to a template
  picker when it has closed.
- Every outbound message records its status: queued, sent, delivered, read, failed (with reason).
- Opt-out: a contact who replies STOP (or is marked opted out) receives no optional notifications.
  Replies to messages they send us are still allowed.

**Notifications (Support number)**

| Notification | Default |
|---|---|
| Ticket received (with ticket number) | **Always on** |
| Ticket assigned to an agent | Optional, off |
| Awaiting your reply | Optional, off |
| Resolved | Optional, off |
| Closed, with satisfaction link | Optional, off |

Optional notifications are switched per tenant and per queue in Setup.

## 4. Connector: prepared for both cases

COEX defines one **canonical Channel API**. Only a small adapter changes between the cases.

Endpoints (built in M6.1; `<tenant>` is the tenant slug):

| Call | Case A (COEX sends) | Case B (XVERSE collects) |
|---|---|---|
| Incoming message | `POST /api/channels/<tenant>/inbound` | same |
| Delivery receipt | `POST /api/channels/<tenant>/status` | same |
| Messages to send | COEX worker `coex-channels` calls the XVERSE send API | `GET /api/channels/<tenant>/outbox?limit=50` |
| Report sent/failed | n/a | `POST /api/channels/<tenant>/outbox/ack` with `{ "acks": [{ "id", "status": "sent|failed", "providerMessageId", "error" }] }` |

Setup, WhatsApp, "How messages go out" selects the case. Collected messages are held for two
minutes; an unacknowledged one is offered again, up to six attempts, then marked failed.

- **Case A (XVERSE already has webhook + send API):** COEX builds an `XverseProvider` adapter that
  maps XVERSE's payloads to canonical form and calls XVERSE's send API from a worker
  (pm2 `coex-channels`), with retries and backoff.
- **Case B (XVERSE lacks them):** XVERSE is extended to post canonical payloads to COEX and to pull
  pending messages from the COEX outbox, acknowledging each one.
- A **Mock provider** lets M6.1 to M6.5 be built and tested before XVERSE is confirmed.

**Canonical inbound message**
```json
{
  "providerMessageId": "string, unique per provider",
  "channelAccount": "support | crm (resolved from the receiving number)",
  "to": "+9715XXXXXXXX",
  "from": "+9715XXXXXXXX",
  "profileName": "string or null",
  "sentAt": "ISO 8601",
  "type": "text | image | document | audio | video | location | contact",
  "text": "string or null",
  "media": { "url": "string", "mimeType": "string", "fileName": "string", "size": 0 },
  "replyToProviderMessageId": "string or null"
}
```

**Canonical outbound message** (one outbox row)
```json
{
  "id": "COEX outbox id",
  "channelAccount": "support | crm",
  "to": "+9715XXXXXXXX",
  "kind": "text | template | media",
  "text": "string or null",
  "template": { "name": "string", "language": "en", "parameters": ["..."] },
  "media": { "url": "signed COEX URL", "mimeType": "string", "fileName": "string" },
  "context": { "ticketId": "id or null", "contactId": "id or null" }
}
```

**Canonical status update**
```json
{ "providerMessageId": "string", "outboxId": "id or null",
  "status": "sent | delivered | read | failed", "at": "ISO 8601", "error": "string or null" }
```

**Security and reliability (both cases)**
- Every call is signed: `X-COEX-Timestamp` = unix seconds; `X-COEX-Signature` =
  `sha256=` + hex HMAC SHA256 of `"<timestamp>.<raw body>"` with the tenant's signing secret
  (generated once in Setup, WhatsApp). A GET signs an empty body. Older than 5 minutes is rejected.
- Inbound is idempotent on `providerMessageId`; a repeated delivery is acknowledged and ignored.
- Secrets and API keys are stored encrypted with `COEX_ENCRYPTION_KEY`, entered in Setup, never in
  `.env`.
- Outbox: retries with backoff, then marked failed and shown to admins. Every send is audited.

## 5. Setup page (Setup, WhatsApp)
- Connection: provider (XVERSE or Mock), base URL, API key, webhook secret, test button.
- Numbers: Support number (target queue), CRM number (default owner or team).
- Templates: list synced from XVERSE (or entered by hand in Case B), mapped to notifications.
- Notifications: the table in section 3, per queue.

## 6. Milestones

| Milestone | Delivers | Needs XVERSE confirmation? |
|---|---|---|
| M6.1 Foundations | Channel accounts (2 numbers), canonical models, channel outbox, signed inbound endpoint, Mock provider, Setup page | No |
| M6.2 Support inbound | Known/unknown matching, auto tickets, open ticket threading, reopen rules, attachments | No |
| M6.3 Replies | Agent replies, 24 hour window, template picker, delivery status | No |
| M6.4 Notifications | Ticket received (always), optional ones per queue, opt-out | No |
| M6.5 CRM number | Activities on timeline, conversations inbox, Send WhatsApp, convert to ticket | No |
| M6.6 XVERSE adapter | Case A adapter in COEX, or Case B spec handed to the XVERSE team; end to end test; go live | **Yes** |

## 7. Questions for the XVERSE team (to settle Case A or B)
1. Does XVERSE send a webhook for every incoming message? Payload sample?
2. Is there a send API for text, template and media messages? Authentication method?
3. Are delivery and read receipts sent back by webhook?
4. How are webhooks signed, if at all?
5. Can templates be listed through an API?
6. How is media delivered (URL, expiry, authentication)?
7. Rate limits, and how a number or account is identified in calls.
8. One XVERSE account with two numbers, or two accounts?

## 8. Out of scope for M6
Bulk or marketing broadcasts (stay in XVERSE), chatbots and AI auto replies, group chats, WhatsApp
for staff tasks, payments.

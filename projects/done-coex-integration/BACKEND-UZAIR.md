# Backend handover — Uzair

Status: responsibilities agreed; implementation awaits dOne access.

## Ownership

Uzair owns dOne backend authentication, integration adapter, identity mapping, secure configuration, attachment forwarding, update handling, retries and backend deployment readiness. COEX integration changes are coordinated separately. Browser code must not call privileged COEX APIs with embedded credentials.

## Implementation sequence

1. Inspect dOne login/session and company membership. Resolve authenticated identity on the server.
2. Agree mapping of immutable dOne company/user IDs to COEX records, including inactive users and mapping changes. Document who provisions mappings; avoid automatic email-based account takeover.
3. Finalise [API contract](API-CONTRACT.md) and authentication with the COEX side.
4. Build a separate adapter/service for list/create/read/reply/attachments; keep COEX details outside general frontend code.
5. Handle timeout, unavailable upstream and idempotent retries. Do not show success before COEX saves the request.
6. Implement verified updates after transport is selected; never trust unsigned webhook events.
7. Add meaningful tests for other-user/company/tenant denial, replay/expiry, duplicate requests, private attachments and disabled identities.

## Handover deliverables

- Exact repository/module locations, local setup and start/build/test commands.
- Safe environment template with descriptions and no actual credentials.
- Versioned contract, request examples and fixture/mocks shared with Bilal.
- Test results, logging/troubleshooting guide, update/retry behaviour and known limitations.
- Health checks and backend release/rollback instructions verified on the selected hosting stack.

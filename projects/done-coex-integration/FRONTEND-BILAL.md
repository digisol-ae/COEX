# Frontend handover — Bilal

Status: responsibilities agreed; actual framework/layout pending discovery.

## Ownership

Bilal owns dOne's web Support section and its presentation/state management. It calls dOne backend endpoints defined by the shared contract. Customer/clinic scope is enforced by the server, not dropdowns, hidden fields or frontend filters.

## Screens and states

- Support entry: prominent Create / View Your Support Ticket; existing signed-in dOne identity.
- My tickets: own requests, subject/number/status, search, filters and pagination; clear loading, empty, unavailable and retry states.
- Create: subject, message and attachments; paste images and preview before sending; disabled duplicate submit; preserve unsent draft after recoverable failure.
- Conversation: support neon green/customer light yellow, theme-aware readable ink, sender/date/time, long-message expansion, protected thumbnails and previews. Adapt to dOne's approved design system after inspection.
- Reply: validation, progress, success, retry and closed-ticket explanation. Distinguish saved message with failed attachments from total submission failure.
- Updates: visible unread/new-reply state. Browser alerts require opt-in and depend on browser/OS permissions; do not promise closed-browser push unless implemented.

## Parallel development

Use synthetic mocks from the agreed API contract. Include access denied, expired session, missing ticket, unavailable backend, attachment failure and duplicate-submit cases. Replace the mock adapter with the real backend without rewriting screen logic.

## Handover deliverables

Component/route map, local run/build instructions, environment template for public settings only, mock switch/setup, responsive/theme/accessibility checks and screenshots or other evidence approved for the handover. Never include backend secrets in a frontend environment file or bundle.

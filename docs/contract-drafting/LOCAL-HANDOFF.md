# Contract templates and customer agreements

Local implementation completed on 25 October 2026. Production release requires the owner's separate approval. No Git push or production deployment is part of this work.

## Use

1. Open Contracts, then Contract templates.
2. Four starters are available: IT Basic, IT Standard, IT Comprehensive, and R4 Annual Maintenance and Support Subscription. Edit a starter and save it as a custom template, or create/duplicate templates without a fixed count limit. Custom templates can be archived.
3. Create or open a customer contract. Open Draft agreement on its detail page. Templates are filtered to the contract type. The R4 starter requires yearly billing.
4. Open Populate agreement fields, review imported customer details, dates, products and commercial terms, and complete additional fields. Preview and generate the agreement.
5. Edit the full text, save, review and print/save PDF or download text. Unresolved placeholders prevent marking the agreement reviewed. Changes to the agreement clear its review checkbox.
6. Attach the signed document using the existing Microsoft 365 document link. Internal review is separate from signature, contract activation, billing and email sending.

## Source decisions

The five supplied files remain unchanged in `docs/contracts_templates/`. Their contents are reference material rather than application instructions.

- All four IT PDFs have materially similar service scopes; none explicitly defines Basic/Standard/Comprehensive tiers. Basic and Standard are proposed narrower scopes; Comprehensive retains the extensive security, server, network and Active Directory provisions. All exclude replacement parts unless expressly included.
- Source customer identities, historical dates, amounts, branch/chair quantities and signatories are not copied into reusable templates. Use the customer record, contract details and explicit additional fields.
- The IT source has a 15% main price-review cap and a separate 5–10% annexure statement. The starter uses the main 15% cap, 60-day advance notice and 15-day objection terms; review notes flag this decision.
- The R4 source has inconsistent 2026/2027 dates and both two-month and 90-day termination provisions. The starter uses dynamic contract dates and the annual automatic-renewal clause with 90-day notice. Review notes flag the conflict.
- R4 service, severity, confidentiality, data ownership, export timing/fees, manufacturer escalation and price-increase provisions are retained as reference wording. Staff must review these commitments and the IP wording before using an agreement.
- Review notes are internal and excluded from print/download. R4 is classified as a subscription.

## Persistence and access

`AgreementTemplate` and `AgreementDraft` are tenant scoped through the repository wrapper. Page reads require `contract.read`; mutations require `contract.manage`. Every mutation records an audit event. Saved customer agreements hold their template identity/revision and a text snapshot. Template edits and archives cannot rewrite existing drafts. Revision checks reject stale updates; regeneration explicitly asks before replacing existing wording. A unique tenant/contract index prevents multiple current draft records. Renewed contracts start without carrying old signed wording or dates.

Templates and generated text are stored as application records; no uploaded binary contract files are stored by this feature. Signed files remain external Microsoft 365 links. Print uses escaped plain text in an isolated frame, avoiding execution of customer content. There is no automatic email, invoice, signature, or production deployment.

## Verification

- Type checks passed for web, root, shared and API workspaces.
- Optimized Next.js production build passed with both new routes.
- Targeted tests cover template substitution, literal customer content, review completeness, tenant isolation, stale edits, snapshot preservation, archiving, R4 type/billing checks, and existing contract/renewal behavior: 46 tests passed on isolated local MongoDB.
- Authenticated browser QA used an isolated local database and synthetic customer, staff session and contracts. Custom template creation, extra-field population, generation, full-text editing, review/save/reload, download, print invocation, R4 filtering and rejection of incomplete review passed. Desktop and 390px mobile screenshots were inspected. No page errors or horizontal mobile overflow were observed. OS print-dialog saving and physical signatures were not automated.
- The first database attempt used the existing test configuration and hit the shared Atlas collection limit. Successful database runs used a dedicated local MongoDB instance on loopback port 27019 and test-prefixed databases. No shared customer records were cleared.

Local Docker web is rebuilt from this checkout for review at http://localhost:3110/contracts/templates. This is a local environment; production is unchanged. Source changes remain uncommitted on the existing `codex/digisol-sidebar` branch. Existing unrelated untracked files and sample documents are preserved. QA evidence is in `outputs/qa/contract-drafting/`.

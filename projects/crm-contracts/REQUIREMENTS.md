# Requirements

## Confirmed on 26 October 2026

- Work carefully, in a proper project, step by step.
- Keep CRM Markdown documents separate from unrelated work.
- Prepare the foundation first. John will later provide product brochures, details and live project examples for customization.
- Maintain multiple reusable contract templates with no fixed template-count limit.
- Apply a selected template to a customer agreement, populate customer and commercial information, then allow editing and review.
- Add subscription product coverage for dOne with modules, Xverse, Worktello, Hello Worktello, and future products.

## Required categories

| Category | Intended coverage |
| --- | --- |
| IT AMC | IT Basic, IT Standard, IT Comprehensive and future IT maintenance variants |
| R4 / EMR / HIS AMC | Maintenance and support agreements for the relevant clinical software |
| Subscription based products contract | dOne and selected modules, Xverse, Worktello, Hello Worktello, R4 subscription and future subscription products |
| Services based | Integration and development engagements, with other service templates added as required |

Category describes how templates are organised. Billing/service model is a separate concept: R4 may have an AMC or a subscription agreement. Do not silently convert existing customer contract types, prices or renewal terms when introducing categories.

## Foundation design to validate before implementation

- Categorise templates and group/filter the library and customer template picker.
- Store product identity separately from template title; allow future products without code changes or a fixed list of product names.
- Reuse the existing product catalogue and parent/module relationships. Record selected modules, quantities and rates per billing period using existing contract service lines where possible.
- Separate shared agreement structure from product-specific scope, inclusions, exclusions, commercial terms and service schedules.
- Let staff duplicate/customize templates. Preserve tenant boundaries, audit history and saved customer draft snapshots.
- Distinguish foundation drafts awaiting product evidence from reviewed product templates. Decide the simplest representation during Step 1; do not imply a brochure automatically establishes contractual terms.

## Details pending evidence

Actual module names/features, licence metrics, hosting arrangements, integrations, third-party fees, implementation deliverables, support hours/response promises, backups, data handling/export, renewals, price reviews, termination, IP, acceptance, warranties and liability terms.

Do not invent these details or populate assumed product pricing. Record unknowns and their sources separately. Product-specific contract customization follows source intake and owner review.

## Existing boundaries

Invoices and payments remain in Zoho Books. Microsoft 365 signed-document links remain supported. On 3 November 2026 the owner extended scope to sending agreements for customer signing inside Worktello; see [Customer signing](DIGITAL-SIGNATURES.md). This authorises the local signing feature and its invitation workflow. Automatic provisioning, payment collection, production deployment and unrelated CRM redesign remain outside this scope.

## Confirmed on 3 November 2026

- Customer agreements must appear on tenant letterhead when signing, printing or downloading.
- Multiple contracts may be sent on different dates/times; retain a separate traceable request reference, document revision, recipient, timestamps and status for each send.

- Scope clarified: UAE and international business contracts, not limited to UAE. Customer options include touch/stylus drawing, signature-image upload, and typed/style previews. Proceed with native evidence controls for now and report credible lower-cost/open-source provider candidates. See EVIDENCE-CONTROLS.md; do not claim universal or DocuSign-equivalent compliance.

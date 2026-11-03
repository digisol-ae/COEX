# Manual QA — 25 October 2026

## Verified

- 27 chapters across staff, administration and customer-portal workflows; seven indexed resolution records with original evidence/limitations.
- Browser initial rendering and default desktop viewport: readable layout, navigation and screenshots. Source/source-links are relative; live app links use the actual HTTPS hostname.
- Search: Gantt filters to one intended chapter. Search ranking corrected to prioritize chapter IDs/titles and exclude unrelated link metadata. Outlook search lists the matching chapter for selection.
- Customer role filter shows six relevant chapters and excludes administrator Setup/import/access chapters from navigation. This is a reading filter, not an access-security mechanism.
- Reading step check → reload persists only local progress; Reset chapter ticks clears the test progress. No application task/time record is affected.
- Screenshot zoom dialog opens the real Gantt image with provenance caption and closes correctly.
- Evidence archive and selected figures: blank customer/staff sign-in, Setup/import screen, Outlook before/after and blank create form, Teams blank create form, catalog 1.2.0. Gantt images are older actual isolated synthetic QA screens, clearly labelled as such.
- Outlook fix: actual web SSO, list/detail/time/assignment-control rendering and blank create form read passed. Existing Teams web SSO/list/create-form read passed. No task, email, reassignment, timer/time-entry, import or share-send mutation performed.
- Local preview endpoint serves manual 200 and rejects private .env and .git/config 403. Directory listing is disabled. No CDN/secret/app dependency required.
- Source syntax and portable ZIP integrity checked; bundle includes a SHA256 file manifest, linked technical records and blank CSV template.

## Explicit limits

The advertised viewport override did not change the actual IAB viewport (measured 1280 px); it was reset. No mobile/tablet visual pass is claimed. Responsive CSS has mobile/navigation/print rules, but real narrow-device acceptance remains pending. Physical printing/PDF-save dialog and offline opening on a second computer are not claimed as browser-tested. The Print manual action assembles all chapters and waits for images before invoking the browser print dialog; native print acceptance remains a reader check.

A complete module guide does not mean every business transaction was freshly tested. Existing service/database QA is linked with its original date and scope. Screenshot captions/provenance prevent a screen render or mocked/isolated test from being represented as a production write/delivery test.

Owner requested fewer screenshots after review: inline guide reduced to three figures for timeline planning, CSV import/export and Outlook troubleshooting. Simple login/navigation/create-form captures moved to assets/archive; retained locally/versioned for evidence, not displayed as extra reader steps.

## Midnight maintenance — 26 October 2026

Reviewed merged main through 0539bad and existing dated release/resolution evidence. Updated generic section-search guidance, corrected deployed import status while retaining its UI acceptance limits, added Microsoft 365 web guidance with Copilot explicitly unverified, and indexed existing migration/search/sidebar resolution records. No screenshots added. No fresh browser/device/print or production write acceptance was performed for this documentation run. Original application work and private exports remain excluded. Package, link, hash and publication checks are recorded in the midnight checkpoint.

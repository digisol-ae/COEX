# Customer resources QA — 3 November 2026

Implementation in the isolated checkout `/Volumes/sd-mac/Developer/DigiSol/worktello-show-more-live`, branch `codex/customer-resources`, based on main `c236132`. Original mixed checkout preserved. This is local QA, not a deployment record.

## Automated verification

- 71 unit files / **455 tests passed**. New checks cover expiry defaults/bounds, file signatures/size, private response headers, roles, anonymous/customer upload denial, customer-directory permission, CSRF rejection, share-path HttpOnly/Secure cookies and suppression of internal verification errors.
- **20 tests passed** across dedicated resource sharing and existing email-sender database suites. Dedicated resource tests cover the 72-hour default/custom expiry, email contents, no-account file gating, atomic OTP claim/replay, guess limits, cooldown/quota, fresh-code replacement without expiry extension, existing-browser persistence, expired/revoked/suspended access, unshared-file and cross-share token denial, tenant isolation, recipient binding, drafts, disabled outbound mail, archive behavior, duplicate/concurrent request keys, and ticket permissions/OTP exclusion from public replies.
- Database tests used only local MongoDB 27020 with `coex_test_resources` and `coex_test_email-senders` databases. No shared/production data cleared.
- Workspace types, source-only ESLint and formatting checked. Generated `.next-performance-qa` output must be excluded from source lint. Next's generated tsconfig additions are not feature source.
- Production Webpack build passed, with 86 generation entries and the PDF worker emitted. Final CI is recorded by the draft PR when available.

## Actual browser walkthrough

App: http://localhost:3123. Database: `worktello_resources_local` on 127.0.0.1:27020. Storage: `/private/tmp/worktello-resources-storage`. All customer/user/ticket/resource fixtures are labelled QA and use `.test` addresses. No email/SMTP worker was started. Test emails remained in the local outbox.

- Staff signed in as a synthetic tenant administrator and opened Support → Customer resources. Published PDF/video and an excluded draft appeared correctly.
- Selected the PDF, found the existing synthetic customer by search, reviewed the default 72 hours, and queued the link and OTP in one customer email.
- Customer link displayed only an OTP form before verification. One successful code revealed the selected PDF; reload retained browser access without another code.
- Bundled PDF.js rendered the actual guide in a canvas. The in-app browser's native PDF iframe showed a blank plugin region, so the feature uses its own renderer instead. Original PDF download succeeded: 906 bytes, SHA-256 identical to stored content.
- Actual multipart browser upload published a labelled text guide. The MIME/file checks and private storage endpoint were used.
- Ticket Share resources selected the uploaded document and a video, customized expiry to 24 hours, queued the OTP email, and posted a public reply containing the resource link. Database inspection confirmed two selected resources, 24-hour expiry, no OTP in the public conversation, and no CC on the dedicated OTP email.
- Sharing history showed OTP verification and one download. Revoking the share blocked its previously verified browser on reload.
- A 390px customer-page check showed no horizontal overflow; file links wrap, PDF controls wrap and the canvas scales to the page. Browser viewport override reset afterwards.
- An alternate localhost alias was correctly refused for POST origin verification; canonical configured app URL was used for acceptance.

## Boundaries

No real customer inbox delivery, live customer upload, production deployment or external-video playback acceptance claimed. Video provider/source permissions need actual customer-approved content during pilot. Link verification and download activity are not proof of reading/watching. Native mobile browsers and all Office variants have not been individually exercised. Expired/revoked files cannot be fetched again; downloaded copies remain with the recipient.

Synthetic preview/seed helpers refuse non-local databases. Temporary QA credential/OTP capture files are mode 0600 under `/private/tmp` and must never be committed. Screenshots are synthetic-only evidence in `docs/manual/assets/archive/`; they are not live screenshots.

## Ticket composer follow-up

Share resources now opens inline beside Reply to customer and Internal note. Local browser verification selected the synthetic PDF, submitted a labelled QA message from that tab, and confirmed the public reply in the conversation and return to the reply tab. Reopening Share resources retains the 72-hour default and opens no dialog. The library sharing drawer remains available. Source lint and web typecheck passed. This follow-up is local only; no real customer mail was sent.

## Same-page document viewing

Replaced the customer View document external-tab link with an inline preview control. PDFs use the bundled viewer; previewable images and plain text use a protected same-page frame. Local browser verification confirmed that clicking View document retains the shared-resource URL and renders the synthetic PDF; download remains separate. Source lint and web typecheck passed. The synthetic PDF was restored from its previously downloaded QA copy after temporary storage had been cleared; no customer file was changed.

## Customer footer branding

Extracted the existing sign-in Powered by branding into a shared component and used it in the customer resource footer, outside the access-state branches. The footer includes the original DigiSol logo and copyright on verification, content and unavailable-link screens. Local browser screenshot confirmed the logo renders on the customer document page. Source lint and web typecheck passed.

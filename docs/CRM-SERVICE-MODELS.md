# Contractual and subscription services

Implemented locally on 21 October 2026. No deployment or real customer contract changes in this work.

## Where to work

1. **Products:** add or edit a product; choose Contractual, Subscription or both. For a module, select its parent product (for example dOne). Products, modules, hardware and support use the same catalogue.
2. **Opportunities:** choose the service model. Opportunity recurring value remains **per year**, independently of the eventual billing cycle. A won subscription opportunity prefills a subscription agreement; existing contractual/project conversion remains available. Quotes are still created in Zoho Books and linked by reference.
3. **Contracts & subscriptions:** use the Contractual/Subscriptions filters. Add an agreement, choose the customer, agreement start/end dates and billing cycle. Monthly payments do not imply a one-month commitment.
4. **Customer → Services:** see both models together, status, agreement dates, amount/cycle and upfront charges. Add service opens the agreements list preselected to that customer; detail opens the billing/renewal record. Visible only with contract.read; creation needs contract.manage.

## Pricing examples

- **IT contractual support:** fixed agreed charge per selected billing period.
- **Perpetual R4 support:** choose annual percentage pricing, enter perpetual licence value and support percentage. AED20,000 ×15% = AED3,000/year, or AED750/quarter. Each cycle amount rounds to the nearest minor unit; it is not a final invoice/proration engine.
- **Subscription:** add R4, server hardware, dOne modules or Xverse as product lines. Enter quantity and unit rate in the agreement currency **per selected billing period**. Their sum determines the recurring amount, overriding the single fixed-amount box.
- **Setup and training:** separate one-time upfront charges; not included in recurring totals and reset to zero on renewal. Review any new onboarding charge explicitly on the renewal draft.
- **Server hardware:** record ownership and return terms separately from pricing.

Rates are agreement snapshots. A later product rename/price edit does not silently reprice an existing agreement. Product/module lines are tenant-scoped, must use active products and respect their configured service models. Parent links are tenant-scoped and cannot point to another module. No automatic starter catalogue/products or real customer records were inserted.

Existing contracts retain their original type/amount/billing and default to fixed pricing with zero upfront fees and no itemised lines. Existing opportunities default to Contractual; no bulk migration changes customer financial records. Legacy Project contracts remain readable/editable. Renewal retains recurring rates, percentage basis, hardware terms and contacts, and keeps the existing history/activation flow.

## Validation — 21 October

- Workspace TypeScript and ESLint passed. Final git diff --check passed.
- Final Webpack production build passed, 54 routes. Verified local COEX dev process restarted on port3100 to load new Mongoose schemas; server reported Ready.
- Existing contracts (19) and CRM foundation (7) regressions passed. First combined run's new fixture accidentally used invalid kind moduleId; corrected before the final new-suite run.
- New service terms: 2 database +3 unit tests passed (2 files /5 tests), including persistence/update, annual percentage calculation, upfront separation, renewal reset, module parent, model restriction and tenant boundaries.
- Opportunity model save/update: 1 passed /16 skipped in focused run. The full opportunity suite was not rerun.
- Initial sandbox DB run was blocked by MongoDB DNS/network; network-authorised reruns used disposable coex_test_* databases only.
- Browser access restored after user reload. Verified Contracts & subscriptions heading/model filters; contractual percentage fields; subscription hides percentage option; adding product line with quantity2 and rate300 shows live600 total; catalogue service-model controls and module-parent selector; customer Services empty state; Add service preserves customer filter and prefills the correct customer. All drafts closed without saving or altering real commercial records. Product edit submit label corrected from Add product to Save product; focused ESLint passed. Browser persistence/renewal on populated records remains unverified; isolated database save/update/renewal tests passed separately.
- Previous 20 October full-regression findings remain open; this feature work did not fix them. No full-suite all-clear, real invoice, email, payment, activation, Git push or deployment implied.

## Boundaries

COEX records commercial terms and billing reminders. Zoho Books remains the invoice/payment/quote authority. This does not add payment collection, automated provisioning, mid-term seat changes/proration, tax calculation or a new quote editor. dOne support integration is a separate project and remains waiting for its local setup/access.

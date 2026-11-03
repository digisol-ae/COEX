# Guided imports, match review and contacts — 25 October 2026

## Problem and confirmed cause

The customer import file used Client, country names and bare website domains. Validation required lowercase enums, two-letter country codes and full URLs, but downloadable templates had no examples. Matching names/emails were silently skipped. Contacts had ordinary CRM forms but no CSV transfer.

A separate live configuration problem was confirmed and repaired earlier: /srv/coex/app/.env had no AUTH_SECRET while Docker supplied it. A private backup was made, a random import signing secret added without changing the existing mail-encryption key, and only active coex-app restarted. Earlier authorized live import: 111 created, 13 matches skipped, zero errors. The 13 business rows remain for owner review; this implementation does not decide their identity or automatically write them again. Private business exports are not committed.

## Change

- Seven downloadable templates include two marked valid sample rows. Formatting/allowed values, required fields, reference order and matching rules appear beside the download. Marked example rows block the full preview.
- Matches identify existing records or prior CSV rows and their reason. Customers/contacts include incoming and existing values. No implicit skip: every matching row requires a decision and re-preview before commit.
- All modules support explicit skip. Customers/contacts also support separate creation and targeted update. Product code uniqueness and other module creation rules remain enforced. File-only matches cannot be updated; two CSV rows cannot update one destination.
- Blank update fields preserve existing values. Permissions, tenant scope, soft deletes, CRM audit/primary-contact rules and portal email protections remain enforced through existing services.
- Contact transfer links by unique customer name or explicit customerId; both must agree when supplied. Matches are scoped to a customer and use name/email/normalized mobile. Country/mobile and boolean values are validated. No portal-user provisioning, contact relocation, notes/custom-field transfer or automatic merge.
- Preview proofs bind CSV, choices, match snapshots, tenant, actor and entity for 15 minutes. A per-tenant/entity lock and checks before each write catch changed matches. Partial runtime failures are reported; whole-file transactions and exactly-once retry are not claimed. Retry failed rows only.
- Downloadable review report includes all decisions/results. User manual and What's new updated; screenshots of the old live interface are labelled historical, not evidence of the new controls.

## Verification and release state

Full final checks: 55 unit files / 384 tests passed; workspace typecheck, ESLint with zero warnings, CI formatting globs, git diff check, and optimized 75-page production build passed. Disposable Docker integration passed all listed scenarios, including explicit customer IDs and foreign-customer rejection. Final targeted integration also passed resolved-parent binding after name reuse. Local browser QA was refused by the origin permission gate at localhost:3111; no alternate browser/automation workaround was attempted. UI interaction/responsive acceptance is pending. No production deployment or new production business mutation for this implementation.

Isolated integration command uses scripts/check-import-review.ts, only permitted inside Docker with mongo hostname and coex_test_import_* database names. Existing coex_docker_local/QA/production data is not cleared or used for these tests. The older Docker integration harness was updated for contacts/explicit decisions but not run against shared fixtures.

## Next release checks

Verify AUTH_SECRET without exposing it, run authenticated preview after rollout, test downloaded examples and contact matching interactions on desktop/mobile, then let the owner review the 13 previously skipped customer rows. Retain the current blue slot as rollback when deploying a separately built green candidate. Existing workers need no restart for this web-only feature.

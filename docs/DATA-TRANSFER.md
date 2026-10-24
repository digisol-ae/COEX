# Import and export

Open **Setup → Import and export**. Staff need `tenant.manage` and the module's
read permission; imports also require its manage permission. Tasks and tickets
require read-all, and leads require lead.read.all. Customer-facing accounts
cannot use these endpoints. Task exports retain the existing private Space and
Folder visibility rules, including personal work privacy.

## First version

CSV templates, preview, create-only import, per-record results and CSV export are
available for tasks, tickets, customers, leads, products and contracts.

- Import up to 500 records / 2 MB; export up to 10,000 core records.
- Template headings are case-sensitive. Unknown headings are rejected; exported
  `_id`, `_number`, `_status`, `_owner`, `_assignees`, `_folder` columns are reference
  information only and are ignored on import.
- Import customers and products before records that refer to them. Customer,
  Space and queue names must resolve uniquely in the current tenant. Contract
  products use codes separated by `|`.
- Preview validates the entire file before issuing a signed, 15-minute approval
  token bound to the exact file, tenant, account and module. Invalid rows block
  the whole import. Commit repeats validation and duplicate checks.
- Import creates records through the existing services, preserving numbering,
  audit and alert rules. It does not overwrite existing records. All imports for
  one tenant/module are serialized by a database lock. A crashed run's lock
  expires after 30 minutes.
- Each result identifies created, skipped or failed records. A runtime failure
  can leave a partial import; retry skips matches already created. No database
  transaction across the whole file is claimed.
- Imports use each module's normal initial state: tasks in the first column and
  unassigned, tickets New with the queue's assignment rules, leads New owned by
  the importer, contracts Draft, customers/products active.
- Exports contain the core template fields plus reference metadata. They exclude
  attachments, conversation history, custom fields, contract service lines,
  detailed pricing rules, linked contacts and product parent/service-model
  configuration. These details remain editable through their existing forms.
- Exports neutralize spreadsheet formulas and are served privately without
  caching. Import mutations and exports are recorded in the audit log.

## Docker verification — 23 October 2026

The old host COEX servers on 3104, 3106 and 3107 were stopped. Docker remains on
localhost:3110 with its existing isolated `coex_docker_local` database.

`scripts/seed-docker-demo.ts` creates 10 idempotent, labelled synthetic tasks and
10 tickets, a Docker QA Space, support queue and test customer. It refuses to run
outside the expected Docker container/database. Integration and browser checks
also add labelled Docker QA records, so totals may exceed 10.

Verification commands (repository root):

```sh
sh scripts/docker-local.sh exec -T web npx tsx scripts/seed-docker-demo.ts
sh scripts/docker-local.sh exec -T web npx vitest run tests/unit/data-transfer.test.ts tests/unit/data-transfer-access.test.ts
sh scripts/docker-local.sh exec -T web npx tsx scripts/check-docker-transfer.ts
sh scripts/docker-local.sh exec -T web npm run typecheck
```

Coverage includes CSV quoting/multiline/BOM, size and count limits, spreadsheet
formula protection, schema/date/amount validation, module permissions, all six
module imports/exports, duplicate replay, invalid references, preview tampering,
a concurrent-import lock and cross-tenant reference isolation. Browser QA covers
upload → preview (one duplicate skipped) → import (one customer created) → CSV
download with that customer verified in the downloaded file. An unauthenticated
CSV export returned HTTP 401.

Artifacts and synthetic browser fixture are under
`/Volumes/sd-mac/Developer/Docker/{logs,exports,fixtures}`. This is local work;
no commit, push or production deployment is included.

## Verification completed after restart

- Full optimized production build completed successfully in Docker (including
  TypeScript and route generation). Root TypeScript and focused lint also passed.
- 24 focused tests passed: 13 CSV/schema, 7 permission, 4 navigation tests.
- The integration script now uses unique synthetic records to verify actual
  creation on every run, preview no-write, exact count increases, duplicate
  replay, invalid mixed files, repeated rows, expired/tampered preview proofs,
  concurrent-import lock, cross-tenant references, real-account permission
  denials, other-person personal task privacy and internal ticket-note privacy.
- Browser import/create, export and template download passed for all six
  modules. Downloaded CSV contents included the newly imported records. Invalid
  task priority blocked import; the customer duplicate was skipped.
- Browser console had no errors and there was no document horizontal overflow
  at the inspected desktop viewport (1265 px). No mobile-device QA is claimed.
- The original 10 labelled demo tasks and 10 labelled demo tickets persist;
  additional labelled QA records are retained for inspection.

Final build log: `coex-transfer-production-build-resume.log` in the external
Docker/logs folder. Final browser image: `coex-import-export-final.jpg`.

# Worktello: one local development folder

Current release: Payroll merge `608d3ff`, live app3026 / website3027; see `ai/RELEASE-2026-11-28-PAYROLL.md`. Unrelated signing/archive/loader changes remain preserved on `codex/consolidated-worktello-20261127`, outside this release.

Owner instruction, 27 November 2026: all Worktello work belongs in
`/Volumes/sd-mac/Developer/DigiSol/worktello`.

## Active source

- Application: this repository root (`apps/`, `packages/`, `tests/`, `scripts/`).
- Website: `website/`, an independent Git repository within the same approved folder.
  It retains its own history and remote; do not add it to the application repository.
- Payroll: integrated runtime is `packages/shared/src/payroll/` and `apps/web/src/modules/payroll/`.
  Original supplied code remains under `outputs/payroll/`. Read `ai/CLAUDE-PAYROLL-INTEGRATION.md`.
- Brand source: `assets/brand-source/`; design handoff originals remain in their existing local folder.
- Reports: `outputs/weekly-updates/`; earlier reports are in its `home-folder/` and
  `external-volume/` subdirectories. The weekly automation now writes directly to this location.
- Website developer source bundle: `outputs/website-handoff-source.zip`.
- Other existing outputs, manuals, QA evidence, uploads and local environments remain preserved.

Start all new application work here. Do not create sibling or `/Users/syedali/` Worktello
checkouts. Historical paths in old chats, release records, scripts and recovery snapshots do not
change this instruction. `AGENTS.md`, `CLAUDE.md` and the AI entry points carry the same rule.

## Preserved consolidation checkpoint (historical)

Baseline: remote merged `origin/main` at `fe2bb070dafd5687acefd09e25e1b8606333a446`.
Working branch: `codex/consolidated-worktello-20261127`.

Pending user-archive changes from the previous SaaS checkout and contract change-request / both-party
signature notification changes were ported into this baseline. The one overlapping signature test
block was resolved by retaining both the module-disabled tests and the new notification/revision tests.
The dormant paint-loader alternative and its original preview were also preserved without enabling it.

Most original main-folder edits were older copies of changes already present upstream. They were
not layered over the newer implementation: doing so would remove newer signing, SaaS, navigation
and email behavior. The original main working state is recoverable from Git ref
`refs/worktello-recovery/original-main-20261127`, its saved stash, original branch and recovery files.
Older draft-PDF clones and historical documentation variants are also preserved for comparison;
they do not override newer merged code.

This organization task did not push, deploy, send email, migrate production data or restart
production services. Local tests and builds are separate from CI and live acceptance.

## Recovery map

`.local-development/` is a private, Git-ignored recovery area, not an active development location.
It contains relocated worktrees/clones (with branches, pending changes, dependencies, local
configuration and generated data), old repository backup, source ZIPs and superseded handoffs.
Do not develop in those recovery copies. All original linked application worktrees now physically
reside below this root, and independent historical clones retain their own Git histories.

Detailed local records:

- `.local-development/consolidation-2026-11-27/relocations.json`: every source/destination.
- `pending-inventory.json` and `pending/*/`: pre-move changes and copies.
- `historical-content-check.json`: comparison of original edits with existing Git history.
- `applied-pending.json`: source files ported into the consolidated app.
- `all-branches-before.bundle`: verified complete application history before consolidation.
- `worktrees-after.txt`: final registered application checkout locations.
- `symlink-repairs.json`: absolute dependency-link repairs, if any.

Generated Next.js caches from the old main checkout were moved into `generated-before/` and route
types regenerated. Actual environments and upload storage were preserved. Credentials and recovery
copies are excluded from ordinary Git staging. Do not attach or publish those private copies.

## Validation

Application unit tests: 497 passed. Database tests: 414 passed, against a new local isolated
MongoDB replica-set container, never the production database. Workspace typecheck and application
production build passed. Changed-file ESLint passed. Website relocation checks and final recovery
verification were recorded in `ai/LOCAL-CONSOLIDATION-VALIDATION.txt` on the preserved consolidation branch.

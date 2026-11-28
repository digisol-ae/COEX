# Payroll owner setup and local QA

Payroll is deployed through PR106 / merge `608d3ff`. See `ai/RELEASE-2026-11-28-PAYROLL.md` for exact live processes, verification and rollback. Do not deploy the unrelated consolidation branch to reproduce this release.

Open https://worktello.com/payroll as the platform owner. Select HR, named approvers and Accounts and enable DigiSol Payroll. Configure PKR thresholds, leave policy, employees, salary structures/assignments and approved opening data. Confirm Zoho account mapping separately before enabling journal export. Final payslip design review remains last. What’s New opens only from the account menu.

To reproduce disposable local browser QA only:

```bash
docker start worktello-payroll-test-mongo
MONGODB_URI='mongodb://127.0.0.1:27029/coex_test_payroll_browser?directConnection=true' \
  npx tsx --tsconfig tsconfig.json scripts/qa/payroll-local.ts
PORT=3101 COEX_NEXT_DIST_DIR=.next-payroll-qa \
MONGODB_URI='mongodb://127.0.0.1:27029/coex_test_payroll_browser?directConnection=true' \
COEX_APP_URL='http://localhost:3101' AUTH_URL='http://localhost:3101' npm run dev
```

The helper recreates only its hardcoded loopback `coex_test_payroll_browser` database with synthetic accounts. It must never be adapted to real credentials or a production database. The stopped task-owned test container retains this disposable database locally.

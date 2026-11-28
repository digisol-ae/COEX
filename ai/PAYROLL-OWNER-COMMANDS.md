# Payroll: owner review and release commands

Prepared 28 November 2026. These commands are for John to review and execute; they were not run by the implementation task.

```bash
cd /Volumes/sd-mac/Developer/DigiSol/worktello
git status --short
git log --oneline origin/main..HEAD
git diff --stat origin/main...HEAD
git push -u origin codex/consolidated-worktello-20261127
```

This branch includes the preceding local consolidation checkpoint as well as Payroll. Review both commits. The checkout contains historical untracked outputs and separately maintained manual automation changes; do not stage them indiscriminately. Real payslip samples, environments, credentials, old source copies and the staff Zoho-account mapping are excluded from the Payroll commit.

For a PR after pushing:

```bash
gh pr create --repo digisol-ae/COEX --base main \
  --head codex/consolidated-worktello-20261127 \
  --title "Integrate Payroll with isolated salary access and transactional payment recording" \
  --body-file ai/PAYROLL-PR.txt
```

Use the latest `deploy/DEPLOYMENT-STATUS.md` and `deploy/ZERO-DOWNTIME.md` for production rollout. Inspect the current service/release paths before executing the repository deployment scripts; older ports in historical records are not current commands. Keep the separate `website/` repository and its deployment intact. No production deploy/restart command is guessed here.

After deploying, the platform owner opens `/payroll` in DigiSol, selects HR, approvers and Accounts and enables the module. Configure PKR thresholds, leave policy, employees, salary structures/assignments and approved opening data. Confirm Zoho account mapping separately before implementing/enabling journal export. Final payslip design review remains the last stage.

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

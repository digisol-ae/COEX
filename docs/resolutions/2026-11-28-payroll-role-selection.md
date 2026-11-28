# Payroll role selection — 28 November 2026

The owner clarified that HR and approvers are assignments, not permanent named people. Payroll setup now labels the selectors HR users, Payroll approvers and Accounts users. HR and approver selections start empty; no user is chosen by matching a name. The owner selects current active staff. Existing stored permissions and approval settings are not reassigned by this UI correction.

Removed personal-name references from runtime approval comments. Approval continues to use configured user IDs. No new What’s New entry or automatic popup is added.

Deployed through PR108 / merge `c817d4a` on app3028/site3029 after passing PR CI, server build, candidate checks and 20 HTTPS sample sets. The signed-in owner browser verified the three generic labels and empty selections. No form was submitted, no permission was changed and What’s New stayed closed. Rollback and current runtime are recorded in `ai/RELEASE-2026-11-28-PAYROLL.md`.

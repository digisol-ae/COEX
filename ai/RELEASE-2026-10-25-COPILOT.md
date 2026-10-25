# Microsoft 365 workspace and Copilot pilot — 25 October 2026

## Actual state

PR #46 merged as `76cac60ac9c4fa6af1d12b1ddb8aa83c8f18b071`. PR CI 40154234041 and main CI 40171303876 passed. Local types/lint/format and Webpack production build passed; 370 unit tests passed before three added package regressions, with 373 in the final CI suite. Agent, plugin and app manifests passed official Microsoft schemas. The real registration package is versioned under `outputs/microsoft/Worktello-Teams-1.3.0/`; packaging source and public metadata live in `scripts/lib/copilot-package.mjs` and `config/microsoft/copilot.public.json`. No credential is in these files.

## Authorization

The owner explicitly approved each browser save: Microsoft 365 web client on existing `access_as_user`; an SSO registration restricted to DigiSol and the existing app; then the generated API alias, Microsoft Enterprise token-store client and Microsoft callback URL. Saved manifest verified all five clients, both identifier URIs, exact callback and token version 2. Existing Teams/Outlook settings were retained. Saved public values are in the configuration JSON; UI evidence is local in `outputs/qa/microsoft-hosts-2026-10-25/`, excluded from this release.

## Production

- Active blue `coex-app`, PM2 id14 / PID329947, port3001, `/srv/coex/releases/copilot-pilot-20261025` at application merge above; candidate was built from tree-identical head94a1a36.
- Warm green rollback `coex-app-green`, id13 / PID318054, port3002, `/srv/coex/releases/outlook-web-20261025` at d547d25.
- Workers10/11/12 remain unchanged in `/srv/coex/releases/worktello-20261025`; restart counts0. Exactly five PM2 entries, online, explicit Node22.23.4 interpreters verified. Copilot API flag is enabled on blue; signed delegated identity, exact audience/tenant/client and task permissions remain required. Anonymous/invalid-token probes rejected401.
- Fresh backup completed before cutover. Apache snapshot `/srv/coex/shared/apache-before-copilot-20261025110558`; monitor `/tmp/worktello-copilot-switch-20261025110558.log` returned40/40 HTTPS200. Both canonical COEX proxies now target3001. PM2 saved.
- Standing owner release logout:2 old tenant sessions revoked at cutoff2026-10-25T07:05:58Z. Read-only follow-up found0 old unexpired sessions. New sessions are excluded by creation cutoff. This is next-request sign-in enforcement, not immediate UI logout or an unsaved-draft preservation claim.
- Rollback: first verify green3002 login200, restore both canonical Apache snapshots (or change only proxy3001→3002), configtest and graceful reload. Keep workers and both releases. Green lacks the new Microsoft365/Copilot client support. Do not repeat expiry for documentation-only sync.

## Live acceptance and remaining blocker

Existing Teams catalog app updated to Worktello1.3.0; published version verified. Real Microsoft365 web SSO and My Tasks list now work; a safe filtered view is saved locally. Outlook was reloaded for regression. No production task, email, timer, assignment or update mutation was sent by this pilot.

The new Copilot agent ID ends `.worktelloTasks` and reads its updated instructions. Both a task-preview request and an explicit GetWorktelloOptions diagnostic reported the tools unavailable. No authenticated Copilot API call reached Apache during the observed checks; only an anonymous401 health probe was logged. The pilot account has Business Basic and no Microsoft365 Copilot add-on; the product list showed no Copilot subscription. This is a licensing/capability prerequisite to resolve for the next pilot, not proof that every package/tenant issue is excluded. Do not claim Copilot task creation works until an entitled account loads actions and completes preview/confirmation/create acceptance.

Microsoft guidance: https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/faq#what-licenses-do-i-need-to-purchase-to-develop-declarative-agents-or-custom-engine-agents . A one-user licensed pilot was offered; no purchase, license assignment or paid consumption was enabled. Native developer mode was used for diagnostics and should be disabled on the temporary test chat after investigation.

## Manual and cloud follow-up

Manual PR #45 merged as d2054b8; its main CI40171897124 passed. This is source/documentation only, not an application rebuild. Keep subsequent source HEAD versus compiled application revision distinct. The actual local project was renamed during work to `/Volumes/sd-mac/Developer/DigiSol/worktello`; old coex compatibility paths can be stale. `projects/` and unrelated generated outputs are preserved. Manual/cloud writing setup belongs to its separate docs workflow; keep API-key and paid-service prerequisites explicit.

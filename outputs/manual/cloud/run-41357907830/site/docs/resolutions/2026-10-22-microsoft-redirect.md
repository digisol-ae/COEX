# 22–25 Oct 2026 — Microsoft login returned to localhost

- Status: Deployed; real sign-in verified
- Historical record indexed on 25 October 2026; this is not a new reimplementation.

## Symptom

The callback could build a destination from the internal listener address.

## Confirmed cause / behavior

Redirect origin did not consistently use the configured public application URL.

## Scoped resolution

Use the configured canonical HTTPS origin for callback outcomes.

## Verification and limits

Redirect regressions and real production Microsoft sign-in on 25 October.

## Original evidence and operating details

Read the original implementation/QA/release record for exact revision, tests, deployment and rollback: `../../ai/RELEASE-2026-10-22-ENTRA-FOOTER.md` (path relative to docs/manual/index.html). Do not treat this summary as a new production write test or a reason to repeat the fix.

## Manual

See the resolution register in `../manual/index.html#resolutions`. New evidence supersedes pending claims without deleting historical records.

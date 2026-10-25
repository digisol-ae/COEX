# 24–25 Oct 2026 — Subtask checkbox/count did not settle correctly

- Status: Deployed; synthetic UI verified
- Historical record indexed on 25 October 2026; this is not a new reimplementation.

## Symptom

Full-page checkbox state/count needed to follow server-confirmed toggling.

## Confirmed cause / behavior

Uncontrolled checkbox state did not consistently track optimistic/reconciled state.

## Scoped resolution

Use controlled completion state/count with existing action error rollback.

## Verification and limits

Synthetic check/uncheck/reload flow documented; no real production task mutated for demonstration.

## Original evidence and operating details

Read the original implementation/QA/release record for exact revision, tests, deployment and rollback: `../SUBTASK-CHECKBOX-QA.md` (path relative to docs/manual/index.html). Do not treat this summary as a new production write test or a reason to repeat the fix.

## Manual

See the resolution register in `../manual/index.html#resolutions`. New evidence supersedes pending claims without deleting historical records.

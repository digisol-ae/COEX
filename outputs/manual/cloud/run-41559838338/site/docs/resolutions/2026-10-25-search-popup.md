# 23–25 Oct 2026 — Search popup trapped by the header

- Status: Deployed; production read checked
- Historical record indexed on 25 October 2026; this is not a new reimplementation.

## Symptom

The popup position/layer could be affected by the header on intermediate screen widths.

## Confirmed cause / behavior

A blurred/transformed ancestor contained the fixed overlay.

## Scoped resolution

Render the popup in document.body and clamp it to the visible viewport; keep focus and stale-request handling.

## Verification and limits

Responsive synthetic/local QA and production permitted-result search documented.

## Original evidence and operating details

Read the original implementation/QA/release record for exact revision, tests, deployment and rollback: `../SEARCH-QA.md` (path relative to docs/manual/index.html). Do not treat this summary as a new production write test or a reason to repeat the fix.

## Manual

See the resolution register in `../manual/index.html#resolutions`. New evidence supersedes pending claims without deleting historical records.

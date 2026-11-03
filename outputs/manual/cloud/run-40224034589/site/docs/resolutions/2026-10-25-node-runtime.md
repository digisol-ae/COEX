# 25 Oct 2026 — Patched Node runtime activation

- Status: COEX application process trees verified
- Historical record indexed on 25 October 2026; this is not a new reimplementation.

## Symptom

Production application processes still used the older Node runtime.

## Confirmed cause / behavior

Updating requirements alone does not replace the executable of an already running process.

## Scoped resolution

Install verified Node 22.23.4 side by side and activate explicit interpreters for web and one-at-a-time workers.

## Verification and limits

Actual parent/descendant executables under five PM2 entries verified. Host-global Node/PM2 daemon replacement was not claimed.

## Original evidence and operating details

Read the original implementation/QA/release record for exact revision, tests, deployment and rollback: `../../ai/RELEASE-2026-10-25.md` (path relative to docs/manual/index.html). Do not treat this summary as a new production write test or a reason to repeat the fix.

## Manual

See the resolution register in `../manual/index.html#resolutions`. New evidence supersedes pending claims without deleting historical records.

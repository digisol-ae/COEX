# 22 Oct 2026 — Tutorial link save showed Not allowed

- Status: Deployed; write/playback acceptance limited
- Historical record indexed on 25 October 2026; this is not a new reimplementation.

## Symptom

A valid tutorial link could be denied behind the production HTTPS proxy.

## Confirmed cause / behavior

Browser public Origin was compared only with an internal listener origin.

## Scoped resolution

Accept the exact configured public origin while keeping administrator and foreign-origin rejection.

## Verification and limits

Route regression, local/server build and public auth checks; signed-in save/playback not claimed.

## Original evidence and operating details

Read the original implementation/QA/release record for exact revision, tests, deployment and rollback: `../../ai/RELEASE-2026-10-22-TUTORIAL-ORIGIN.md` (path relative to docs/manual/index.html). Do not treat this summary as a new production write test or a reason to repeat the fix.

## Manual

See the resolution register in `../manual/index.html#resolutions`. New evidence supersedes pending claims without deleting historical records.

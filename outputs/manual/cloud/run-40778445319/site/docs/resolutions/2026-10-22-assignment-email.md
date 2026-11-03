# 22 Oct 2026 — Teams assignment email expectations

- Status: Owner-accepted behavior deployed
- Historical record indexed on 25 October 2026; this is not a new reimplementation.

## Symptom

Email was absent when assigning a Teams-created task to the creator.

## Confirmed cause / behavior

Existing staff self-action suppression; another selected assignee received mail.

## Scoped resolution

Retain intentional self-assignment suppression; reuse normal alerts for another assignee and tenant email switches.

## Verification and limits

Owner confirmed behavior; queue/service evidence retained. No real test mail sent by this manual.

## Original evidence and operating details

Read the original implementation/QA/release record for exact revision, tests, deployment and rollback: `../../ai/RELEASE-2026-10-22-TUTORIAL-ORIGIN.md` (path relative to docs/manual/index.html). Do not treat this summary as a new production write test or a reason to repeat the fix.

## Manual

See the resolution register in `../manual/index.html#resolutions`. New evidence supersedes pending claims without deleting historical records.

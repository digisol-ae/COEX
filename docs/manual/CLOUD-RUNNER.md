# Midnight cloud documentation

The GitHub workflow `.github/workflows/nightly-manual.yml` runs at **00:00 Asia/Karachi** (19:00 UTC) and can also be started explicitly. GitHub may delay scheduled starts. It works without the laptop, local SSD, production server or a local browser session.

## Two distinct operations

1. **Packaging and validation:** works without an AI key. It validates the existing manual and saves a versioned, portable ZIP with source commit and run status in GitHub Actions artifacts. Artifacts expire after 90 days; source and reviewed documentation stay in Git. Download important snapshots locally.
2. **AI documentation drafting:** requires the repository secret `OPENAI_API_KEY` and repository variable `MANUAL_AI_ENABLED=true`. This is separate API usage, not the desktop ChatGPT subscription. No key or paid billing has been configured by this setup. Use a dedicated project/key and set the account's usage controls before enabling it. Never paste a key in chat, source control or a manual.

A full authenticated AI run is **not verified** until those prerequisites exist and a real `full` run succeeds. A successful packaging-only run is not proof of AI writing. Keep the existing local midnight automation until the authenticated cloud run and its review path have passed; then disable the local writer to avoid duplicate work.

## Enable AI writing

In GitHub repository Settings → Secrets and variables → Actions, add `OPENAI_API_KEY` as a secret and `MANUAL_AI_ENABLED` as a variable with value `true`. An authorized owner should configure API billing/usage separately. Start **Midnight manual maintenance** from Actions, select `full`, and inspect all jobs and the generated draft. Scheduled runs use full mode only when prerequisites and material source changes exist. An open `codex/nightly-manuals` PR pauses further AI drafts until reviewed.

Codex runs read-only with no Git write credentials. A separate clean job validates a bounded JSON proposal, preserves existing screenshots, labels changes **AI draft — review required**, and allows only manual content and draft resolution records. Another job can push the dedicated documentation branch and open a PR; it cannot change application code through the validated proposal. Review before merging. Repository settings must allow Actions to create pull requests. No auto-merge, deployment, production login, screenshot creation or business mutation is included.

The workflow has a ten-minute AI job timeout, not a monetary spending cap. API charges depend on the provider's account/model and usage. GitHub runner/artifact limits depend on repository/account policy. This setup does not enable paid services automatically.

## Local copies

Run `python3 scripts/sync-manual.py` from the current local project to download the most recent successful cloud snapshot, or add `--run RUN_ID`. GitHub CLI must already be signed in. The SSD must be mounted when syncing. Snapshots are extracted to `outputs/manual/cloud/run-RUN_ID/site/`; existing folders and working files are never overwritten. Archive paths and per-file hashes are checked before extraction. Local sync is an explicit action; cloud jobs cannot write to an offline laptop.

## File purposes

- `.github/workflows/nightly-manual.yml`: cloud schedule and separated read/draft/package/review jobs.
- `.github/codex/prompts/nightly-manual.md`: durable instructions, including honest evidence and sparse screenshot rules.
- `.github/manual-proposal.schema.json`: limits the structure the AI may return.
- `scripts/manual-cloud.py`: trusted evidence/path/text checks and draft application.
- `scripts/package-manual.py`: builds the offline HTML manual ZIP.
- `scripts/sync-manual.py`: downloads and safely extracts local copies.
- `scripts/test-manual-cloud.py`: checks boundaries using temporary local files only.

The operator adds the run URL and actual results here after validation. Missing credentials, failed publication and unverified live workflows must remain explicit.

References: [Codex GitHub Action](https://learn.chatgpt.com/docs/github-action), [GitHub schedule behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

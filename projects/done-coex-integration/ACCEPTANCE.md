# Acceptance checklist

All unchecked: integration has not started. Use synthetic identities/data and isolated test databases for destructive tests.

- [ ] dOne setup verified and frontend/backend independently runnable.
- [ ] API/authentication contract reviewed by Uzair and Bilal.
- [ ] Valid dOne user accesses own support area without separate COEX login.
- [ ] Unknown/inactive/unmapped users receive safe errors.
- [ ] Other contact, company and tenant ticket IDs cannot be read, replied to or downloaded.
- [ ] Internal notes/system events/private attachments/staff time never returned.
- [ ] Create/reply, image paste, preview/download and refresh persistence work.
- [ ] Closed/merged ticket rules and partial attachment failure are clear.
- [ ] Timeout/retry does not create duplicate tickets or replies.
- [ ] Expired/replayed/invalid identity tokens and forged events are rejected.
- [ ] New support reply updates dOne; notification delivery/click tested separately.
- [ ] Mobile, Light/Dark/other supported dOne themes and keyboard interactions checked.
- [ ] No privileged credentials in frontend bundle, logs or Git.
- [ ] Beginner deployment rehearsal and rollback pass with exact instructions.
- [ ] John reviews result; pushed/deployed status independently recorded.

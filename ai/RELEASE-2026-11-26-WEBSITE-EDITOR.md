# Website content editor live — 26 November 2026

PR [#99](https://github.com/digisol-ae/COEX/pull/99) merged as `2eeaad9fb09ad7aba7d12206734eb8d4697cbdac`.
Compiled source `4ffbcb2796d937931a678c98bb7ee7ba546e8220` matches the merged main application tree.
Cutover completed at **16:58 PKT / 11:58 UTC on 26 November 2026**.

## Live runtime and scope

- Release `/srv/coex/releases/website-editor-20261126-4ffbcb2`, web process
  `coex-app-website-20261126`, loopback **3021**, Node 22.23.4.
- All four Worktello/COEX Apache vhosts now proxy to 3021. Forwarded-IP hardening retained;
  configtest and graceful reload passed. PM2 saved.
- Prior `coex-app-backlog-20261126` remains online on 3020 as warm rollback.
  Mail, desk-close and channel workers remain on their prior release without restart.
- Existing environment-file chain, authentication and action settings, sessions and storage
  remain. Previous hashed static assets were copied without overwriting candidate assets.
- Setup → Website Content is available to active stored platform_admin users only. Other tenant
  administrators cannot acquire editor, history, preview, upload, publication or restore access
  through permission overrides. Public reads select only the published snapshot.
- Plain-text landing copy, primary button links, FAQs, SEO/social metadata, raster image
  replacement and private uploads are supported. Drafts preview at desktop/mobile sizes;
  explicit Publish changes the public snapshot. Restore creates a new draft.
- Uploads accept static PNG/JPEG/WebP up to 700 KB, decode bounded pixels, remove metadata and
  re-encode WebP. Quota-aware files remain outside MongoDB. Explicit media records and current
  publication references control access. No-store responses and static-only image optimizer
  patterns prevent protected media from entering the public optimizer cache.
- Historical media is retained for restoration. Identical original labels share one replacement;
  SVG/generated illustration internals retain the supplied design.

## Validation and acceptance

- Fourteen isolated database tests cover stored-role/inactive-owner denial, private drafts,
  CAS/concurrent writers, transactional audit rollback, explicit publish/restore, safe URLs,
  private media lifecycle, quota enforcement and failed upload rollback.
- Final unit suite includes 486 tests. Repository types, lint, formatting and production builds pass.
- Final PR CI [45813770716](https://github.com/digisol-ae/COEX/actions/runs/45813770716) and
  merged-main CI [45814630422](https://github.com/digisol-ae/COEX/actions/runs/45814630422) passed.
- Local browser verified draft save, private desktop/mobile preview, explicit publish,
  restore-to-draft, private image upload and saved social-image draft using isolated QA data.
- Production read-only service check: actual active owner read succeeds; an actual non-owner
  with forged owner context is denied. Editor revision was zero.
- Existing signed-in owner browser session successfully rendered the deployed editor and upload
  controls. Publish is disabled until the first draft is saved. No production content was saved,
  uploaded, restored or published as a test. The supplied public landing remains in place.
- Anonymous protected pages redirect to login without editor data. Ten public HTTPS login
  samples and the landing returned 200; missing private media returned 404/no-store; optimizer
  access to protected media returned 400. Candidate health passed before cutover.

## Backup and rollback

Fresh private backup directory: `/srv/coex/shared/backups/website-editor-20261126`.
Database `before.archive.gz` and `storage-before.tar.gz` passed gzip integrity checks.
Private pre-cutover PM2 snapshot, all four vhost originals, read-only guard check and cutover
summary are retained there. This was an online backup; no new restore rehearsal is claimed.

Rollback:

1. Verify `http://127.0.0.1:3020/login` returns 200 (start the retained prior process if needed).
2. Restore the four `*.conf.before` files from the backup to `/etc/apache2/sites-available/`.
   Run Apache configtest, graceful reload and public HTTPS checks.
3. Keep the new process until traffic is confirmed back on 3020, then stop it and save PM2.
   Leave workers, database, sessions, authentication settings and retained media untouched.
   Do not restore business data for an application rollback.

Local QA app and owned test MongoDB container are stopped, with QA data retained. Leave the Mac
running. Unrelated user-archive changes appeared in the shared checkout during this release;
none were staged, committed, deployed or reverted by this task.

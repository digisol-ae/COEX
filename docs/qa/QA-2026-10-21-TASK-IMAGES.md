# Task update images and attachment drawer QA — 21 October 2026

## Scope and isolation

Browser end-to-end QA on a temporary Next server at 127.0.0.1:3102. Dedicated temporary app source copy, synthetic tenant QA TEST Image UI 21 Oct, synthetic task QA TEST Pasted image update (6ad8f3b1e754fb216b2a3892), database coex_test_tasks, storage /private/tmp/coex-image-ui-1021. No existing main-site task was changed. No external emails or production actions.

## Passed

- Main page clipboard PNG paste creates a pre-send thumbnail with remove control.
- Image-only post succeeds; composer resets and saved update includes thumbnail.
- Reload retains saved image and Documents & attachments count.
- Main page drawer collects saved update images; nested preview opens.
- Half drawer displays saved update and thumbnail.
- Half drawer upload chooser accepts a synthetic PNG and shows pre-send thumbnail.
- Half drawer text-plus-image post succeeds, clears composer and shows newest update first.
- Half drawer central attachments drawer contains images from both update composers.
- Preview/download works; downloaded synthetic image dimensions verified as 320×180.
- Synthetic user reduced from tenant_admin to ordinary agent. Agent can access assigned task, paste/post image and open central drawer. Final count is three persisted attachments.

## Observed minor issue

Very small/compressed images display 0 KB because task attachment labels round bytes to whole KB. File data, rendering and download are correct. No product fix made during this QA-only run.

## Environment findings and limits

Atlas reached its 500-collection limit during isolated sign-in. Only eight verified-empty collections in coex_test_tasks were dropped (projects, portfolios, activities, weeklocks, emailoutboxes, emailsettings, tickets, timeentries). No test records or shared database were deleted. Synthetic login then succeeded; a dashboard pipeline creation still encountered capacity while the scoped task pages/actions worked.

Custom QA server initially required a separate app directory/source copy and explicit allowedDevOrigins. Login redirect fetch on this custom-server setup failed internally, but session was established and direct task navigation succeeded. These setup issues do not constitute acceptance of the login/dashboard flows.

Not covered: drag/drop gesture, every image format/size boundary, real mobile devices, document-link add/remove, ticket-linked images in a browser or full-app regression. Prior automated privacy/linked-note tests are separate evidence.

## Cleanup and evidence

Temporary QA server stopped and launcher scripts removed. Synthetic database records and temporary storage retained; no shared data cleared. Main localhost:3100 server untouched. Downloaded fixture is /Users/syedali/Downloads/coex-image-ui-fixture.png. Evidence screenshots: /private/tmp/coex-task-image-qa-drawer.png and /private/tmp/coex-task-image-qa-preview.png.

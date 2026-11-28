## Required local working location — owner instruction

All Worktello development must stay in `/Volumes/sd-mac/Developer/DigiSol/worktello`.
The independent website repository is `website/` inside that folder. Do not create sibling
or home-folder checkouts or new worktrees without an explicit owner instruction.
`.local-development/` holds private recovery copies, not active development.
Read `ai/LOCAL-DEVELOPMENT.md` for preserved work and `ai/RELEASE-2026-11-28-PAYROLL.md`
for the current deployment. Older paths and ports in historical notes are not current instructions.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

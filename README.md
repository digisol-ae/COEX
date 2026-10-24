# Worktello (formerly COEX)

## Worktello branding and loader — owner decision, 24 October 2026

**Product identity is Worktello (formerly COEX). Approved loader: highlight bars.** Keep `WorktelloLoader` default `variant="highlight"`; root, signed-in and portal loading boundaries use this default. Each complete diagonal W bar brightens in sequence. The build-up alternative remains dormant in the component and is archived at `docs/brand/animations/worktello-build-preview.html` for future use. Do not enable it by default without a new owner request.

This branding/loader commit includes the approved handoff W, user-visible name changes, browser/touch icons, reproducible icon/Teams packaging scripts, saved concept art and previews, and continuity documentation. It deliberately excludes unrelated uncommitted Gantt, Teams permissions/time/sharing, search, subtask and data-transfer changes and local Docker setup. Mixed files are staged by branding changes only; preserve their remaining working-tree changes. No push, merge or production deployment is included in this request.

Current local Docker app at http://localhost:3110 has the rebrand and loader; its existing database/attachment volumes are preserved. Domain/DNS remains with the owner, and formal trademark clearance is unverified. Keep technical COEX identifiers, cookies, environment variables, Microsoft IDs, configured hostnames and protocol headers unchanged for compatibility. SVG exports embed raster masters; do not claim traced vector artwork. Keep DigiSol attribution and legal identity.

Evidence: the preceding rebrand passed 342 unit tests and a 75-page isolated build; loader changes passed focused ESLint, web TypeScript and formatting/diff checks. Browser access to localhost was declined during loader verification; animation and route-transition visual acceptance remain owner-reviewed, not independently browser-verified. No real task/email or Teams app installation was performed. Read `docs/BRANDING.md` and `docs/brand/animations/README.md` for asset locations and reuse.

## AI continuation

Fresh-session handoff: [ai/START-HERE.md](ai/START-HERE.md), [compact context](ai/CONTEXT-2026-10-21.md). Current implementation is local; release state is separate.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## dOne support integration project — 18 Oct 2026

Dedicated planning and AI continuity: [dOne ↔ COEX project](projects/done-coex-integration/README.md). Separate web application; Bilal frontend, Uzair backend, beginner deployment teammate. Waiting for dOne local setup/access; documentation base only, no integration implemented or deployment authorised.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Tabbed Setup workspace — 21 October 2026

Click Setup in the desktop rail/sidebar or mobile menu to open a popup over the current work page. Setup submenu items are tabs: Queues, Tutorials, Email, Pipeline, WhatsApp, Saved replies, Tenant settings, Custom fields and Tenants. Only tabs permitted to the signed-in staff user are listed; every settings page retains its own server permission check.

Queues is the initial tab when permitted; otherwise the first permitted tab opens. Tab links remain shareable /setup/... URLs. Reload/direct navigation also opens the tabbed workspace. Close setup or Escape returns to the originating local page; the entry link carries its path/query so list filters can be retained. Tabs scroll horizontally on narrow screens; content scrolls independently. Arrow Left/Right, Home/End move between tabs.

The sidebar no longer repeats Setup children. Security stays its separate group. Workspace/Email/Pipeline forms render directly inside the Setup panel instead of requiring a nested settings drawer. Other settings drawers elsewhere in COEX are unchanged.

## Implementation and continuity

- Native modal plus Next intercepted/parallel routes preserve the background on client navigation. /setup layout supplies the same UI for hard loads. Shared GROUPS metadata determines permission-filtered tabs. Existing forms/actions are reused, not duplicated.
- Registry: apps/web/src/app/(app)/setup/workspace-content.tsx. When adding a Setup page, update navigation metadata, this registry and its intercepted route under @setupModal/(.)setup.
- The parallel fallback clears the modal on non-Setup navigation; implicit children default uses notFound for unmatched hard loads. Closing accepts only local return paths, excluding protocol-relative/backslash/control-character paths.
- Tutorial preview is rendered inside Setup's native modal through a preview-only FloatingTutorial instance. It does not poll, mark seen or publish; global player ignores the preview event while Setup is open, avoiding an inert player behind the modal or duplicate playback.
- The parallel catch-all makes Next's lint rule misclassify /api/auth/entra as a page. A focused lint annotation preserves its necessary full authentication redirect; no authentication behaviour changed.

## Verification

Workspace TypeScript/ESLint and Webpack build passed (64 generated routes after adding intercepted entries). Initial stale generated route types resolved after regeneration. Browser verified Setup opening over Tasks, Queues default, Pipeline tab content directly visible, Tutorials tab and interactive Preview, Escape returning to Tasks, direct Pipeline URL opening the modal, and390px viewport with full-height modal/scrolling tabs/content. Viewport reset; task-owned background QA tab closed. User's original tabs retained.

No settings values, queues, tutorial publication, email or business data changed. Real-device testing and every tab's mutation flow were not rerun. No Git push/deployment. Existing prior QA findings remain open.

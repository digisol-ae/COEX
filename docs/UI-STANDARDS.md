# COEX shared UI standard — 21 October 2026

Support is the reference for compact, consistent controls across staff screens. Keep theme tokens, shared controls, meaningful icon tooltips and clear module identity; avoid adding a separate visual language per module.

## Implemented locally

- Shared PageHeader spacing, form control padding and staff page gutters reduced.
- Compact filter class applied to Tickets, Tasks, Customers, Leads, Opportunities, Contracts, Team activity and support reporting filters. Preserve coloured Opened/Delayed/Missed analytics and their functionality. Mobile filters wrap; touch-pointer filter targets stay at least44px. Shared header controls get44px touch targets.
- Header plus icon beside Timers opens Task/Ticket/Lead choices. Options follow existing manage permissions; destinations use the existing protected create forms/actions. Each request receives a distinct create query so repeated requests reopen a fresh form even on the same page. No new create endpoint or permission bypass.
- Sidebar collapse/expand button in desktop header. Existing icon rail remains accessible; collapse state persists per browser through the existing navigation store. Mobile keeps its menu drawer. Small SSR-to-hydrated preference transition is expected.
- Shared native SettingsDrawer: right side on desktop, full width on small screens, independent scrolling, native focus trapping/Escape, close button and backdrop dismissal. Workspace, Email and Pipeline forms are behind concise summary/entry controls. Product add/edit, Space settings and Folder settings use the same drawer. Existing customer-specific drawer remains.
- New Ticket shortcut waits for browser hydration before rendering its body portal, avoiding server document access when defaultOpen is true.

## Verification

- Workspace typecheck, ESLint and Webpack production build pass; final diff check recorded after handoff update.
- Browser: collapsed sidebar, navigated/reloaded and confirmed persisted state. Task, Ticket and Lead shortcuts opened their existing forms without saving records. Ticket direct-load hydration issue found and fixed; reloaded query confirmed New ticket dialog.
- Browser: product Edit opened shared drawer with Save product; no save performed. Pipeline drawer opened, scrolled at390px and closed with Escape.
- Browser viewport checks at390px (Leads/header) and320px (Tickets/header/filters): narrow layout inspected, no overall horizontal page overflow at320px (document clientWidth305, scrollWidth305; scrollbar accounts for remaining width). Existing responsive ticket cards retained. Viewport override reset afterward.
- Real physical mobile devices, all individual screens/themes and persisted settings mutations were not exhaustively retested. Space/Folder drawer conversion passed static/build checks; their browser acceptance remains separate from Pipeline/Product checks. No business records, settings values, email, billing or permissions changed in acceptance. Sidebar preference is the only retained UI setting.
- No Git commit/push/deployment. Prior 20 October QA findings remain open.

## Continue using these primitives

Use `PageHeader`, shared Input/Select/Button/IconButton, and `coex-filters` for list filters. Settings should open SettingsDrawer rather than occupy the primary work area. Use explicit labels/accessible names for icon-only actions. Reuse protected creation actions from quick shortcuts. Keep customer portal access separate from staff navigation. Avoid forcing entire data tables into narrow widths; use existing responsive cards or an internal horizontal scroller.

- Customer list follow-up (21 Oct): search/type filters now use a compact responsive two-column grid (desktop176px/112px), replacing full-width controls. Long company-history description moved to heading info tooltip; browser verified dimensions and keyboard tooltip text. Focused ESLint and diff checks passed.

- CRM rail follow-up: active highlight now matches every route in the shared CRM navigation group (Customers, Products, Contracts, Leads, Opportunities and their detail routes), rather than only /customers. Browser verified Opportunities has aria-current=page and rail-glow after reload; focused lint/diff checks pass.

- Module highlight follow-up: shared rail matching now covers every grouped rail destination (Support including Desk report, CRM, Time and Setup); Personal maps to Tasks, while Tasks and Spaces remain distinct. Existing sidebar already selects the most specific page. Thirteen route regression cases and focused lint pass; browser verified Support remains active on Desk report. Local only.

- Compact filters/info follow-up: the shared PageHeader now moves plain explanatory descriptions into a keyboard/hover info tooltip. Record identity/status/term descriptions stay inline via descriptionInline or rich description content. Customers now uses this shared pattern instead of a one-off icon. Shared coex-filters rules size search inputs176px, selects144px, date inputs160px without flex growth; the customer two-column176/112px override remains. Added missing compact markers to Desk report/Time period picker/portal ticket filters and enabled shared tooltip renderer in portal. Browser verified Support widths176/144px and Opportunities widths176/144px plus keyboard tooltip text. Typecheck/lint and final Webpack production build (54 routes) passed. No data mutations or production deployment.

## Setup workspace update

Setup is now a tabbed popup rather than an expanded submenu/page of settings drawers. See [Setup workspace](SETUP-WORKSPACE.md) for routing, permissions and verification.

- My Desk icon (21 Oct): replaced reused task/checklist icon with chair-and-desk SVG based on John’s supplied reference. Uses currentColor/shared rail state for Dark/Light/Sunset; same shared RailLinks serves desktop and mobile menu. Browser confirmed24×24 vector with chair wheels and currentColor stroke; focused ESLint/diff checks passed.

- My Desk heading now uses the same shared DeskIcon as the navigation rail at36px (rail18px), placed left of the page title. Browser confirmed36×36 and currentColor; focused lint/diff checks passed.

- My Desk page icon follow-up: moved36px header icon to far-right action area and rotated180deg at John’s request. Navigation icon unchanged. Browser confirmed180deg; focused lint/diff checks pass.

- Clarification: My Desk far-right icon uses horizontal mirror (scaleX -1), not upside-down rotation. Icon remains upright; browser verified rotate none / scale -1,1. Supersedes preceding180deg rotation note.

- My Desk header icon width increased10% (mirrored scaleX -1.1); height remains36px. Browser confirmed39.6×36px.

- Add/Remove My Desk action now uses the supplied person-behind-table reference as a currentColor SVG. Shared DeskTaskButton keeps its existing plus/check state and behaviour; page/rail chair icon unchanged. Browser verified new person geometry on desk action buttons; focused lint/diff pass.

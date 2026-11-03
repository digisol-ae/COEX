# Worktello desktop installation

Choose **Install Worktello** in the account menu, or open `/install` directly.
The guide is also available before sign-in. Installed apps launch `/login`,
which sends signed-in staff to the dashboard and customers to their portal.

- Windows / Edge: use the install button when offered, or **… → More tools → Apps → Install this site as an app**. Pin the result to Start or the taskbar.
- Mac / Safari: on macOS Sonoma 14 or later choose **File → Add to Dock**, then **Add**.
- Chrome / Windows or Mac: use the address-bar install icon or **… → Cast, save, and share → Install page as app**. Menu wording varies by version.

The website and installed app share the same server and permissions. A browser
may ask the user to sign in again in its installed app. An internet connection
is required. There is no service worker, offline cache, queued offline editing,
or new push notification subscription. Existing notification preferences remain
unchanged. Normal server releases update the application; an open window may
need refreshing to show a new release.

## Implementation

- Next's `app/manifest.ts` emits `/manifest.webmanifest` and automatically links it.
- Stable identity `/`, origin-relative scope `/`, and launch URL `/login` allow
  the same build on staging and production without embedding either hostname.
- Standalone window, brand colors, 192/512 PNG icons, separate maskable icon,
  and an Apple touch icon derived from the existing approved Worktello icon.
- Regenerate icons with `node scripts/generate-pwa-icons.mjs`.
- A root client provider retains the one-use `beforeinstallprompt` event across
  page navigation. It handles acceptance, cancellation, errors, `appinstalled`,
  and standalone display mode. Browsers that do not expose the event get manual
  guidance. It does not claim to detect installations in another browser.
- The install page uses the existing theme variables and is available to staff,
  customers and signed-out visitors. The account-menu link is shared by staff
  and customer navigation. No database or environment changes are required.

## Release acceptance

Before rollout, verify on actual Windows/Edge and Mac/Safari installations:

1. Manifest and icons return 200 over HTTPS before login.
2. Install via prompt/menu; verify icon, name, launch destination and own window.
3. Cancel installation and confirm manual instructions remain available.
4. Verify password and Microsoft sign-in, logout and role-specific landing page.
5. Check internal navigation, external links, file uploads, downloads and previews.
6. Refresh after an application release; confirm the new revision is loaded.
7. Check the guide on a narrow screen and in installed display mode.

Local build/browser checks do not establish acceptance on Windows or Safari,
and do not indicate that production has been deployed.

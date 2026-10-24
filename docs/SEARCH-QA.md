# Quick search QA — 24 October 2026

Fixed locally in Docker. Production remains unchanged.

## Findings and changes

- The 32px trigger allowed its label to wrap outside the button. The trigger now clips its single-line label, retains its full accessible name, and uses a shrinkable header container.
- The glass search overlay was fixed inside the blurred header, creating the wrong containing block and an oversized popup. Search now opens a compact, opaque dropdown portalled to the page body, anchored below the trigger and clamped within the viewport. Maximum width is 360px; results scroll within the remaining viewport height.
- At 768px, the account name crowded search and other header buttons. Below the wide-screen breakpoint the account keeps its avatar and accessible account name; the full label remains available on wider screens.
- Old debounced/in-flight requests are cancelled or ignored after a newer query or close. Loading and failure states are explicit. Reopening starts clean.
- Search has a labelled dialog/input, keyboard result navigation, a focus loop, and focus restoration. Mobile Escape closes only search, preserving the underlying navigation. Where header and mobile search both exist, the shortcut opens only the visible topmost search instance.

## Verified

- Current/default viewport (973px during initial measurement), 768px desktop, 700px overlapping header/mobile breakpoint, and 390px mobile.
- At 768px after the fix: trigger 139 × 32px, dropdown 360px wide within x=396–756, no page horizontal overflow. At 390px: dropdown within x=18–378.
- Real Docker task, space, and customer search results; task navigation using arrows/Enter; no-match and fewer-than-two-character states.
- Cmd+K, Escape, outside-click dismissal, Shift+Tab focus loop, and reopening with a cleared query.
- Mobile search focus, one popup at the overlapping breakpoint, and Escape returning focus to the search trigger while leaving the menu open.
- Web TypeScript, focused lint, Docker image build, and whitespace checks passed. No browser errors observed. Temporary viewport overrides were reset.

Evidence: `/Volumes/sd-mac/Developer/Docker/logs/search-fixed.jpg` and `search-fixed-768.jpg`.

No search API permissions or result scoping changed. Slow-network race and HTTP-failure branches were reviewed in code but not separately fault-injected in browser QA. No full production-build rerun was needed for this UI pass; local route compilation and the checks above were performed. Native touch/virtual-keyboard behaviour remains untested.

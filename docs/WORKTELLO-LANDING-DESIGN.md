# Worktello landing design and assets

Source: [Figma landing 146:762](https://www.figma.com/design/HiWQy9NVMeroOMbVg3Y46M/Worktello-Website-Design?node-id=146-762).

User direction: retain the design, replace Rentix/Renttix, rental, payment and QuickBooks/Xero template claims with accurate Worktello copy, and omit unapproved testimonials. This manifest documents source design geometry; it does not approve product claims.

## Reference and implementation rules

- Desktop source canvas: 1920 px wide, with 1720 px content and 100 px side margins in most sections.
- All 22 requested section contexts are high fidelity; no sparse responses remain.
- Preserve original hash filenames under `apps/web/public/website/figma/`. Some `.png` names contain JPEG/GIF data; original filenames and bytes are intentionally preserved.
- Use SVG assets externally at their root dimensions, with wrapper scaling if required; do not inline, redraw or alter paths.
- Product screenshots are intentionally repeated as cropped layers. Respect the image crop percentages and wrapper geometry in the design contexts.
- Private local working reference: `/private/tmp/worktello-figma-context/<node-id>.txt`; detailed node/variable/asset/crop mapping: `/private/tmp/worktello-figma-context/manifest.json`. No temporary asset URLs belong in runtime code.

## Typography, color and controls

Main font is Poppins (Regular, Medium and SemiBold). Section headings typically use 56 px / 62 px, body copy 18 px / 26 px, labels 12 px semibold, buttons 16 px / 24 px, card titles 24 px, and card copy 16 px. Confirm exact per-element classes in each context. Main ink is #091d3d, dark sections #111111, pale panels #f7f9fc, labels #eff3ff, borders #e5eaf2, white surfaces #fff.

Implement navigation links, CTA buttons, theme preview switch, feature/action accordions, and FAQ items as working controls with keyboard focus and accessible expanded/selected states. Do not introduce fabricated signups or unsupported integration behavior.

## Sections

| Node | Section | Source geometry and assets |
| --- | --- | --- |
| 146:1403 | Navigation | Exact element geometry in source context; 2 static asset variables. |
| 146:763 | Hero background | Two 1920 px full-width background bands, 381.333 and 256 px high. |
| 146:773 | Hero product preview and theme controls | Exact element geometry in source context; 5 static asset variables. |
| 146:776 | Hero heading | Exact element geometry in source context; 0 static asset variables. |
| 146:1383 | Core features accordion | Exact element geometry in source context; 6 static asset variables. |
| 146:782 | Connected workspace map | Pale rounded 22 px panel; 50 px vertical padding; centered diagram and original vector connections. |
| 147:1934 | Tools grid | Exact element geometry in source context; 11 static asset variables. |
| 146:870 | Integrations / connected workspace cards | Pale rounded 22 px panel; 50 px padding; vertical gap 30 px. |
| 146:841 | See Worktello in action accordion | Right column at x=1040, y=5834; heading w=680; explanatory copy w=780. |
| 146:869 | Action artwork image 14 | Action background bitmap: design 890 × 732; original 1780 × 1464. |
| 158:1193 | Action artwork image 15 | Action background vector: 890 × 732. |
| 158:1219 | Action product UI montage | Exact element geometry in source context; 1 static asset variables. |
| 147:1993 | Audiences | Dark full-width panel at y=6662, h=742. Five audience image cards. |
| 146:830 | Meet Worktello | Pale rounded 22 px panel; 50 px padding; 1618 × 328 four-card benefit row. |
| 146:1386 | Why Worktello | Four colored benefit cards at y=8572, total 1722 × 338; pink/purple/blue/amber source cards. |
| 146:1160 | FAQ | Exact element geometry in source context; 2 static asset variables. |
| 146:1190 | Unapproved testimonial template - OMIT | OMITTED by user direction; template section recorded for layout only, avatars not downloaded. |
| 146:1331 | Footer | Footer content spans 1720 px; divider y=11364 in original full source. Replace template claim text. |
| 146:1360 | Hero CTAs | Exact element geometry in source context; 0 static asset variables. |
| 146:1363 | Bottom CTAs | Exact element geometry in source context; 1 static asset variables. |
| 146:780 | Hero floating status crop 1 | 195.3 × 86.448 crop, source image 974.4% × 1164.91%; left -301.87%, top -472.84%. |
| 146:781 | Hero floating status crop 2 | 195.3 × 86.448 crop, source image 974.4% × 1164.91%; left -407.88%, top -472.84%. |

## Asset inventory

All 71 included files are nonempty. Dimensions below are original file dimensions; design slot dimensions and crop percentages are recorded in the private manifest.

| Filename | Original dimensions | Exact source section / variable |
| --- | --- | --- |
| `17a2a.png` | 1536 × 1024 | 146:1403 / `img03ApprovedHandoffW2`; 146:782 / `img03ApprovedHandoffW3` |
| `cd09d.svg` | 20 × 20 | 146:1403 / `imgChevronDown` |
| `fd5d2.svg` | 1920 × 381.333 | 146:763 / `imgHeroIllustration1` |
| `f004a.svg` | 1920 × 256 | 146:763 / `imgHeroIllustration2` |
| `b1ea4.png` | 1903 × 1007 | 146:773 / `imgScreenshot20261120At32733Pm2` |
| `d5781.png` | 720 × 287 | 146:773 / `imgImage16` |
| `3ad0f.png` | 1903 × 1007 | 146:773 / `imgDark`; 146:780 / `imgDark`; 146:781 / `imgDark` |
| `48baa.svg` | 18 × 18 | 146:773 / `imgMoon` |
| `9fe46.svg` | 18 × 18 | 146:773 / `imgSun` |
| `2f9d7.png` | 2846 × 1552 | 146:1383 / `imgScreenshot20261123At10717Pm1` |
| `2f0a9.png` | 2872 × 1552 | 146:1383 / `imgScreenshot20261123At10627Pm1` |
| `80ed2.png` | 2848 × 1552 | 146:1383 / `imgScreenshot20261120At53448Pm1` |
| `07e5e.svg` | 30 × 30 | 146:1383 / `imgPlusCircle` |
| `1abbc.svg` | 30 × 30 | 146:1383 / `imgPlusCircle1`; 146:841 / `imgPlusCircle` |
| `b1d0b.png` | 1264 × 870 | 146:1383 / `imgImage19`; 146:1363 / `imgImage19` |
| `712a5.svg` | 244 × 244 | 146:782 / `imgEllipse2` |
| `817d7.svg` | 310 × 310 | 146:782 / `imgEllipse3` |
| `c4570.svg` | 220 × 1 | 146:782 / `imgLine235` |
| `fb41f.svg` | 200 × 1 | 146:782 / `imgLine238` |
| `18da6.svg` | 350 × 1 | 146:782 / `imgLine236` |
| `bcac0.svg` | 394.5 × 56.7602 | 146:782 / `imgLine239` |
| `3af32.svg` | 394.5 × 56.7602 | 146:782 / `imgLine240` |
| `2235d.svg` | 394.5 × 56.7602 | 146:782 / `imgLine243` |
| `945d7.svg` | 394.5 × 56.7602 | 146:782 / `imgLine244` |
| `453f5.svg` | 264.5 × 67.5 | 146:782 / `imgLine241` |
| `7550a.svg` | 294 × 67.5 | 146:782 / `imgLine247` |
| `3fbf4.svg` | 254 × 66.2598 | 146:782 / `imgLine248` |
| `2449d.svg` | 266 × 66.2613 | 146:782 / `imgLine246` |
| `7f92a.svg` | 394 × 394 | 146:782 / `imgEllipse4` |
| `53889.svg` | 468 × 468 | 146:782 / `imgEllipse5` |
| `eca7e.svg` | 1278.9 × 57.7363 | 146:782 / `imgEverythingYourBusinessNeedsAllConnected` |
| `73b77.png` | 4096 × 2421 | 147:1934 / `imgRectangle34624700` |
| `b67e9.png` | 4096 × 2731 | 147:1934 / `imgRectangle34624701` |
| `8a136.png` | 3706 × 2500 | 147:1934 / `imgRectangle34624702` |
| `4cae5.png` | 4096 × 2734 | 147:1934 / `imgRectangle34624703` |
| `3244c.png` | 4096 × 2304 | 147:1934 / `imgRectangle34624704` |
| `4ecf7.png` | 4096 × 2730 | 147:1934 / `imgRectangle34624705` |
| `ce7b3.png` | 736 × 1308 | 147:1934 / `imgRectangle34624694` |
| `ae87b.png` | 2174 × 1108 | 147:1934 / `imgScreenshot20261124At123919Pm1` |
| `ff844.png` | 2172 × 1228 | 147:1934 / `imgScreenshot20261124At123932Pm1` |
| `52a36.png` | 2172 × 926 | 147:1934 / `imgScreenshot20261124At125829Pm1` |
| `11011.png` | 2204 × 1130 | 147:1934 / `imgScreenshot20261124At121445Pm3` |
| `29bef.png` | 1120 × 630 | 146:870 / `imgRectangle34624944` |
| `a4a17.png` | 80 × 80 | 146:870 / `imgImage20` |
| `d7644.png` | 1119 × 746 | 146:870 / `imgRectangle34624945` |
| `7f3dd.png` | 960 × 640 | 146:870 / `imgRectangle34624946` |
| `f7584.svg` | 76 × 76 | 146:870 / `imgEllipse2` |
| `13f9a.svg` | 76 × 76 | 146:870 / `imgGroup2085662847` |
| `02a2f.svg` | 76 × 76 | 146:870 / `imgGroup2085662848` |
| `f1fb2.png` | 1780 × 1464 | 146:869 / `imgImage14` |
| `7dd3e.svg` | 890 × 732 | 158:1193 / `imgImage15` |
| `6bcbf.png` | 2196 × 1148 | 158:1219 / `imgScreenshot20261125At23951Pm1` |
| `66f8f.png` | 570 × 855 | 147:1993 / `imgRectangle34624721` |
| `336e3.png` | 4096 × 2669 | 147:1993 / `imgRectangle34624722` |
| `2bbfa.png` | 4096 × 2731 | 147:1993 / `imgRectangle34624724` |
| `3d20d.png` | 855 × 570 | 147:1993 / `imgRectangle34624723` |
| `4fb51.png` | 4096 × 2730 | 147:1993 / `imgRectangle34624727` |
| `e03a5.svg` | 26 × 26 | 146:830 / `imgIcon` |
| `a9712.svg` | 26 × 26 | 146:830 / `imgIcon1` |
| `8609e.svg` | 26 × 26 | 146:830 / `imgIcon2` |
| `77367.svg` | 26 × 26 | 146:830 / `imgIcon3` |
| `92ff1.svg` | 29 × 29 | 146:1160 / `imgIcon` |
| `7f371.svg` | 1720 × 1 | 146:1160 / `imgLine28` |
| `461e0.svg` | 48 × 48 | 146:1331 / `imgGroup15` |
| `4e476.svg` | 48 × 48 | 146:1331 / `imgGroup14` |
| `b3eee.svg` | 48 × 48 | 146:1331 / `imgGroup12` |
| `f4d56.svg` | 48 × 48 | 146:1331 / `imgGroup13` |
| `5504f.png` | 1136 × 960 | 146:1331 / `imgSwyOrc4AqMpsYbjnIhwjIwwa6U1` |
| `dc7ad.png` | 600 × 600 | 146:1331 / `imgHand1` |
| `5176f.svg` | 248 × 38 | 146:1331 / `imgGroup1577712358` |
| `74fe2.svg` | 1720 × 0.4 | 146:1331 / `imgLine1` |

## Verification boundary

Asset collection verified nonempty local files and root metadata only. The implementation owner must still verify each rendered asset callsite, layer and effective geometry against the design before completing the page. All assets remain original source bytes.

## Original designer handoff

Original source: `/Volumes/sd-mac/Developer/DigiSol/worktello/Worktello Design Handoff/`. Inventory contains 40 assets: 36 PNG exports and 4 SVG icon tiles. No fonts, README or other guidance files were present. No original source file is byte-identical to a downloaded Figma asset; these are named, pre-cropped/composed exports rather than raw screenshot/photo inputs. Keep downloads until rendered comparison identifies superseded layers.

Prefer a matching original export where it represents the exact same intended slot. `Hero/Hero Image.png` combines the dark dashboard with floating OPEN/OVERDUE badges, but its dashboard is cropped shorter than the Figma source (details below); avoid repeating those badges. `Footer/CTA section.png` is background artwork only; keep heading, text and controls live. The original 52 px Meet Worktello SVGs include tile backgrounds, while downloaded 26 px SVGs represent inner glyphs; avoid duplicating the tile.

| Original asset | Dimensions | Intended Figma section |
| --- | --- | --- |
| `CONNECTED WORKSPACE/Group 2085662846.png` | 76 × 76 | 146:870 |
| `CONNECTED WORKSPACE/Group 2085662847.png` | 76 × 76 | 146:870 |
| `CONNECTED WORKSPACE/Group 2085662848.png` | 76 × 76 | 146:870 |
| `CONNECTED WORKSPACE/MS Teams integration.png` | 560 × 376 | 146:870 |
| `CONNECTED WORKSPACE/Outlook integration.png` | 560 × 376 | 146:870 |
| `CONNECTED WORKSPACE/Smart notifications.png` | 480 × 376 | 146:870 |
| `FOR TEAM CAPTAINS/CRM.png` | 1952 × 1360 | 146:1383 |
| `FOR TEAM CAPTAINS/Requests and Approvals.png` | 1952 × 1360 | 146:1383 |
| `FOR TEAM CAPTAINS/Team Activity.png` | 1952 × 1360 | 146:1383 |
| `Footer/CTA section.png` | 3440 × 676 | 146:1363 |
| `Footer/Footer.png` | 1264 × 940 | 146:1331 |
| `Hero/Hero Illustration - 1.png` | 3838 × 755 | 146:763 |
| `Hero/Hero Illustration - 2.png` | 3838 × 512 | 146:763 |
| `Hero/Hero Image.png` | 2943 × 1632 | 146:773 |
| `MEET WORKTELLO/Customer Support.png` | 720 × 192 | 146:830 |
| `MEET WORKTELLO/Icon - Customer Support.svg` | 52 × 52 | 146:830 |
| `MEET WORKTELLO/Icon - Manage Customers.svg` | 52 × 52 | 146:830 |
| `MEET WORKTELLO/Icon - Manage Work.svg` | 52 × 52 | 146:830 |
| `MEET WORKTELLO/Icon - Track Time.svg` | 52 × 52 | 146:830 |
| `MEET WORKTELLO/Manage Customers.png` | 720 × 186 | 146:830 |
| `MEET WORKTELLO/Manage Work.png` | 720 × 192 | 146:830 |
| `MEET WORKTELLO/Track Time.png` | 720 × 186 | 146:830 |
| `POWERFUL TOOLS. ONE PLATFORM./Keep every opportunity in sight..png` | 372 × 220 | 147:1934 |
| `POWERFUL TOOLS. ONE PLATFORM./Keep every task moving..png` | 372 × 220 | 147:1934 |
| `POWERFUL TOOLS. ONE PLATFORM./Keep oversight within reach..png` | 372 × 220 | 147:1934 |
| `POWERFUL TOOLS. ONE PLATFORM./Lead your team. Stay in control. - 1.png` | 665 × 278 | 147:1934 |
| `POWERFUL TOOLS. ONE PLATFORM./Lead your team. Stay in control. - 2.png` | 848 × 412 | 147:1934 |
| `POWERFUL TOOLS. ONE PLATFORM./Make every hour count..png` | 372 × 220 | 147:1934 |
| `POWERFUL TOOLS. ONE PLATFORM./Stay on top of every request..png` | 372 × 220 | 147:1934 |
| `POWERFUL TOOLS. ONE PLATFORM./Turn activity into clarity..png` | 372 × 220 | 147:1934 |
| `SEE WORKTELLO IN ACTION/CRM.png` | 1526 × 875 | 158:1219 |
| `SEE WORKTELLO IN ACTION/Dashboard.png` | 1526 × 1258 | 158:1219 |
| `SEE WORKTELLO IN ACTION/Support.png` | 1526 × 791 | 158:1219 |
| `SEE WORKTELLO IN ACTION/Tasks & Spaces.png` | 1526 × 744 | 158:1219 |
| `SEE WORKTELLO IN ACTION/Time Reports.png` | 1526 × 833 | 158:1219 |
| `WHO IS WORKTELLO FOR?/Business managers.png` | 328 × 428 | 147:1993 |
| `WHO IS WORKTELLO FOR?/Business owners.png` | 328 × 428 | 147:1993 |
| `WHO IS WORKTELLO FOR?/C-suite executives.png` | 328 × 428 | 147:1993 |
| `WHO IS WORKTELLO FOR?/Product owners.png` | 328 × 428 | 147:1993 |
| `WHO IS WORKTELLO FOR?/Team leads.png` | 328 × 428 | 147:1993 |

## Staged handoff paths and hero mismatch

All 40 originals were copied byte-for-byte into `apps/web/public/website/handoff/` using stable kebab-case paths. Original files and downloaded Figma files remain untouched.

The supplied hero composite is **2943 × 1632**, containing approximately **2600 × 1632** of dashboard plus right-extending badges. At dashboard width 1300 it is about **816 px high**, while Figma uses **1300.002 × 944**. The supplied composite stops after Support; Figma also shows the lower Open Work by Space / Open Work by Person panels. This is a real bottom crop, not whitespace that can be removed to fix the ratio. The theme toggle is also absent from the composite. For exact fidelity use the Figma screenshot-layer reconstruction; do not stretch the composite vertically.

Exact context font identifiers: `General_Sans:Medium`, `General_Sans:Regular`, `General_Sans:Semibold`, `Poppins:Bold`, `Poppins:Light`, `Poppins:Medium`, `Poppins:Regular`, `Poppins:SemiBold`. No font files were included in the handoff.

| Original source export | Local web path |
| --- | --- |
| `CONNECTED WORKSPACE/Group 2085662846.png` | `/website/handoff/connected-workspace/group-2085662846.png` |
| `CONNECTED WORKSPACE/Group 2085662847.png` | `/website/handoff/connected-workspace/group-2085662847.png` |
| `CONNECTED WORKSPACE/Group 2085662848.png` | `/website/handoff/connected-workspace/group-2085662848.png` |
| `CONNECTED WORKSPACE/MS Teams integration.png` | `/website/handoff/connected-workspace/ms-teams-integration.png` |
| `CONNECTED WORKSPACE/Outlook integration.png` | `/website/handoff/connected-workspace/outlook-integration.png` |
| `CONNECTED WORKSPACE/Smart notifications.png` | `/website/handoff/connected-workspace/smart-notifications.png` |
| `FOR TEAM CAPTAINS/CRM.png` | `/website/handoff/for-team-captains/crm.png` |
| `FOR TEAM CAPTAINS/Requests and Approvals.png` | `/website/handoff/for-team-captains/requests-and-approvals.png` |
| `FOR TEAM CAPTAINS/Team Activity.png` | `/website/handoff/for-team-captains/team-activity.png` |
| `Footer/CTA section.png` | `/website/handoff/footer/cta-section.png` |
| `Footer/Footer.png` | `/website/handoff/footer/footer.png` |
| `Hero/Hero Illustration - 1.png` | `/website/handoff/hero/hero-illustration-1.png` |
| `Hero/Hero Illustration - 2.png` | `/website/handoff/hero/hero-illustration-2.png` |
| `Hero/Hero Image.png` | `/website/handoff/hero/hero-image.png` |
| `MEET WORKTELLO/Customer Support.png` | `/website/handoff/meet-worktello/customer-support.png` |
| `MEET WORKTELLO/Icon - Customer Support.svg` | `/website/handoff/meet-worktello/icon-customer-support.svg` |
| `MEET WORKTELLO/Icon - Manage Customers.svg` | `/website/handoff/meet-worktello/icon-manage-customers.svg` |
| `MEET WORKTELLO/Icon - Manage Work.svg` | `/website/handoff/meet-worktello/icon-manage-work.svg` |
| `MEET WORKTELLO/Icon - Track Time.svg` | `/website/handoff/meet-worktello/icon-track-time.svg` |
| `MEET WORKTELLO/Manage Customers.png` | `/website/handoff/meet-worktello/manage-customers.png` |
| `MEET WORKTELLO/Manage Work.png` | `/website/handoff/meet-worktello/manage-work.png` |
| `MEET WORKTELLO/Track Time.png` | `/website/handoff/meet-worktello/track-time.png` |
| `POWERFUL TOOLS. ONE PLATFORM./Keep every opportunity in sight..png` | `/website/handoff/powerful-tools-one-platform/keep-every-opportunity-in-sight.png` |
| `POWERFUL TOOLS. ONE PLATFORM./Keep every task moving..png` | `/website/handoff/powerful-tools-one-platform/keep-every-task-moving.png` |
| `POWERFUL TOOLS. ONE PLATFORM./Keep oversight within reach..png` | `/website/handoff/powerful-tools-one-platform/keep-oversight-within-reach.png` |
| `POWERFUL TOOLS. ONE PLATFORM./Lead your team. Stay in control. - 1.png` | `/website/handoff/powerful-tools-one-platform/lead-your-team-stay-in-control-1.png` |
| `POWERFUL TOOLS. ONE PLATFORM./Lead your team. Stay in control. - 2.png` | `/website/handoff/powerful-tools-one-platform/lead-your-team-stay-in-control-2.png` |
| `POWERFUL TOOLS. ONE PLATFORM./Make every hour count..png` | `/website/handoff/powerful-tools-one-platform/make-every-hour-count.png` |
| `POWERFUL TOOLS. ONE PLATFORM./Stay on top of every request..png` | `/website/handoff/powerful-tools-one-platform/stay-on-top-of-every-request.png` |
| `POWERFUL TOOLS. ONE PLATFORM./Turn activity into clarity..png` | `/website/handoff/powerful-tools-one-platform/turn-activity-into-clarity.png` |
| `SEE WORKTELLO IN ACTION/CRM.png` | `/website/handoff/see-worktello-in-action/crm.png` |
| `SEE WORKTELLO IN ACTION/Dashboard.png` | `/website/handoff/see-worktello-in-action/dashboard.png` |
| `SEE WORKTELLO IN ACTION/Support.png` | `/website/handoff/see-worktello-in-action/support.png` |
| `SEE WORKTELLO IN ACTION/Tasks & Spaces.png` | `/website/handoff/see-worktello-in-action/tasks-spaces.png` |
| `SEE WORKTELLO IN ACTION/Time Reports.png` | `/website/handoff/see-worktello-in-action/time-reports.png` |
| `WHO IS WORKTELLO FOR?/Business managers.png` | `/website/handoff/who-is-worktello-for/business-managers.png` |
| `WHO IS WORKTELLO FOR?/Business owners.png` | `/website/handoff/who-is-worktello-for/business-owners.png` |
| `WHO IS WORKTELLO FOR?/C-suite executives.png` | `/website/handoff/who-is-worktello-for/c-suite-executives.png` |
| `WHO IS WORKTELLO FOR?/Product owners.png` | `/website/handoff/who-is-worktello-for/product-owners.png` |
| `WHO IS WORKTELLO FOR?/Team leads.png` | `/website/handoff/who-is-worktello-for/team-leads.png` |

Font scope: Poppins Regular/Medium/SemiBold provide the main page typography; Light and Bold also occur in the connected-workspace diagram and small UI examples. FAQ questions explicitly use General Sans Regular at 22 px / 30 px, #101828. General Sans Medium/Semibold occur only in the omitted testimonials and need not be loaded for that removed section. Standard corresponding font weights are Light 300, Regular 400, Medium 500, SemiBold 600, Bold 700.

## Self-hosted font delivery

Required fonts are now staged unchanged under `apps/web/public/website/fonts/`: Poppins-Light.ttf (300), Poppins-Regular.ttf (400), Poppins-Medium.ttf (500), Poppins-SemiBold.ttf (600), Poppins-Bold.ttf (700), and GeneralSans-Regular.woff2 (400), all normal style. `fonts/README.md` records official distribution sources and exact use limits; `fonts/sources.json` records URLs, hashes and byte lengths. Included license files are `Poppins-OFL.txt` and `GeneralSans-FFL.txt`.

Poppins uses SIL OFL 1.1, which permits commercial self-hosting with license/copyright retained. Fontshare’s current bundled ITF FFL 2.0 (17 Aug 2026), Section 01, expressly permits self-hosting for the licensee’s own commercial website. General Sans must remain unchanged (no subsetting/conversion), must not be redistributed as a font library, and must not be made selectable for third-party content creation. The Worktello landing page typography fits the express own-website permission.

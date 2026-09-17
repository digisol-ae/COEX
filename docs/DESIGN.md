# COEX design language

## Palette

Source of truth is `DigiSol-Branding/digisol-color-scheme.txt`.

| Brand colour | Hex       | Where it is used in COEX                                                           |
| ------------ | --------- | ---------------------------------------------------------------------------------- |
| Red          | `#ee3d51` | Overdue, SLA breach, destructive confirmation, focus ring, the logo. Nothing else. |
| Black        | `#141414` | Body text, headings, primary buttons                                               |
| Grey         | `#bfbfbf` | Derived into the line and muted text tokens                                        |
| Light brown  | `#f5f8ed` | Muted surfaces, page canvas, selected rows                                         |

## Rules

1. The interface is light and calm. White cards on a warm off white canvas, thin lines, generous
   spacing. Nothing saturated covers a large area.
2. Red is an alarm, not a brand wash. If a screen shows red in more than two places at once, the
   screen is wrong. Primary buttons are black, never red.
3. Status colours are muted versions, each with a soft background for badges, so a full board of
   tasks reads as calm rather than as a traffic light.
4. Type is TT Norms Pro at three weights: 400 for body, 500 for labels and table headers, 700 for
   headings. The files live in `src/app/fonts`.
5. Density matters more than decoration. Managers scan the dashboard, so tables and tiles come
   before illustration.

## Tokens

All tokens live in `src/app/globals.css` under `@theme`. Components use token names such as
`bg-surface`, `text-ink-muted`, `border-line`, never raw hex values.

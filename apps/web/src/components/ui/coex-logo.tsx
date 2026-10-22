import type { SVGProps } from 'react';

// Drawn inline, not as an <img>, so the pill dot can follow the theme: an image cannot read CSS
// variables. The coral letters read on Sunset, Light, Dark and the always-dark login panel alike.
const brandCoral = 'var(--color-brand-red)';

export function CoexLogo({
  title = 'COEX',
  ...props
}: { title?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="-16 216 1508 384" role="img" aria-label={title} {...props}>
      <g
        fill="none"
        stroke={brandCoral}
        strokeWidth={64}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M243.7 333.3A124 124 0 1 0 243.7 508.7" />
        <circle cx={524} cy={421} r={124} />
        <path d="M768 421H1016A124 124 0 1 0 979.7 508.7" />
        <path d="M1160 297L1360 545M1360 297L1160 545" />
      </g>
      <circle cx={1440} cy={546} r={36} fill="var(--color-ink-subtle)" opacity={0.45} />
      <circle cx={1440} cy={546} r={27} fill="var(--color-surface)" opacity={0.7} />
    </svg>
  );
}

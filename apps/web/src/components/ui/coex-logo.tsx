import type { SVGProps } from 'react';

// Supersampled letter artwork avoids small-size SVG stroke rasterisation differences across
// browsers. The dot stays vector-based so its colours can continue to follow the theme.

export function CoexLogo({
  title = 'COEX',
  ...props
}: { title?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="-8 257 1496 328" role="img" aria-label={title} {...props}>
      <image
        href="/brand/coex-wordmark-hires.png"
        x={-8}
        y={257}
        width={1496}
        height={328}
        preserveAspectRatio="xMidYMid meet"
      />
      <circle cx={1440} cy={546} r={36} fill="var(--color-ink-subtle)" opacity={0.45} />
      <circle cx={1440} cy={546} r={27} fill="var(--color-surface)" opacity={0.7} />
    </svg>
  );
}

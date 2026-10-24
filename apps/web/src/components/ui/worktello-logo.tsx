import { useId, type SVGProps } from 'react';

/** Approved handoff W and custom lettering; alpha mask lets the lettering follow its surface. */
export function WorktelloLogo({
  title = 'Worktello',
  inverse = false,
  ...props
}: SVGProps<SVGSVGElement> & { title?: string; inverse?: boolean }) {
  const maskId = useId();
  return (
    <svg viewBox="0 0 1920 300" role="img" aria-label={title} {...props}>
      <title>{title}</title>
      <defs>
        <mask id={maskId} style={{ maskType: 'alpha' }}>
          <image
            href="/brand/worktello-lettering.png"
            x="600"
            y="0"
            width="1320"
            height="300"
            preserveAspectRatio="xMidYMid meet"
          />
        </mask>
      </defs>
      <image
        href="/brand/worktello-symbol.png"
        x="0"
        y="0"
        width="560"
        height="300"
        preserveAspectRatio="xMidYMid meet"
      />
      <rect
        x="600"
        y="0"
        width="1320"
        height="300"
        fill={inverse ? '#ffffff' : 'var(--color-ink, #0B203E)'}
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}

import Image from 'next/image';
import { WorktelloLogo } from './ui/worktello-logo';

/** Product identity is shared; tenant names and user/Space initials stay separate. */
export function BrandLogo({
  mark = false,
  className,
  priority = false,
  inverse = false,
}: {
  mark?: boolean;
  className?: string;
  priority?: boolean;
  inverse?: boolean;
}) {
  if (!mark)
    return (
      <WorktelloLogo
        inverse={inverse}
        className={`block shrink-0 object-contain ${className ?? 'h-10 w-44 max-w-full'}`}
      />
    );
  return (
    <Image
      src="/brand/worktello-app-icon.png"
      alt="Worktello"
      width={512}
      height={512}
      className={`block shrink-0 object-contain ${className ?? 'h-10 w-10'}`}
      priority={priority}
      unoptimized
    />
  );
}

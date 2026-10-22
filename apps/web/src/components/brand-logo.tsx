import Image from 'next/image';
import { CoexLogo } from './ui/coex-logo';

/** Product identity is shared; tenant names and user/Space initials stay separate. */
export function BrandLogo({
  mark = false,
  className,
  priority = false,
}: {
  mark?: boolean;
  className?: string;
  priority?: boolean;
}) {
  if (!mark)
    return (
      <CoexLogo
        className={`block shrink-0 object-contain ${className ?? 'h-10 w-44 max-w-full'}`}
      />
    );
  return (
    <Image
      src={mark ? '/brand/coex-monogram.svg' : '/brand/coex-logo.svg'}
      alt="COEX"
      width={mark ? 512 : 1496}
      height={mark ? 512 : 328}
      className={`block shrink-0 object-contain ${className ?? 'h-10 w-44 max-w-full'}`}
      priority={priority}
      unoptimized
    />
  );
}

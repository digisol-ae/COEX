'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconButton } from '@/components/ui/icon-button';

/**
 * Back to the previous screen, on every screen (John, 1 Oct 2026). A task opened from My tasks,
 * then its preview, then Open task, returns the same way, which a "Back to space" link cannot.
 *
 * The screens visited in this tab are tracked, so Back never leaves COEX: a page opened directly
 * (a link in an email, a bookmark) has no previous screen and goes to the dashboard instead.
 */
const HOME = '/dashboard';

export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [trail, setTrail] = useState<string[]>([pathname]);
  const [previousPathname, setPreviousPathname] = useState(pathname);

  if (previousPathname !== pathname) {
    setPreviousPathname(pathname);
    // Arriving at the screen before this one is a step back, so it leaves the trail.
    setTrail((current) =>
      current.length > 1 && current[current.length - 2] === pathname
        ? current.slice(0, -1)
        : [...current, pathname],
    );
  }

  const hasPrevious = trail.length > 1;
  if (!hasPrevious && pathname === HOME) return null;

  return (
    <IconButton
      icon="back"
      label={hasPrevious ? 'Back' : 'Back to dashboard'}
      className="h-9 w-9"
      onClick={() => (hasPrevious ? router.back() : router.push(HOME))}
    />
  );
}

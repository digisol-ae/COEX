import Image from 'next/image';
import type { NavigationGroup } from './navigation';
import { NavigationTree } from './navigation-tree';

/**
 * The permanent sidebar, shown from the medium breakpoint upwards.
 *
 * Dark on purpose. It anchors the page, holds what little colour the product uses, and leaves the
 * working area white and quiet, which is what people stare at all day.
 */
export function Sidebar({ groups }: { groups: NavigationGroup[] }) {
  return (
    <aside className="hidden w-60 shrink-0 bg-[image:var(--gradient-rail)] px-3 py-6 md:block">
      <Image
        src="/brand/logo-long.png"
        alt="DigiSol"
        width={150}
        height={32}
        priority
        className="mb-8 ml-2 h-7 w-auto"
      />

      <NavigationTree groups={groups} />
    </aside>
  );
}

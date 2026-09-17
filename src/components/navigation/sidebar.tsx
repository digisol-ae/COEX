import Image from 'next/image';
import type { NavigationGroup } from './navigation';
import { NavigationTree } from './navigation-tree';

/**
 * The panel beside the rail, shown from the medium breakpoint upwards.
 *
 * Dark like the rail so the two read as one surface, and the working area stays white and quiet,
 * which is what people stare at all day. The tenant sits at the top because a person working
 * across two client tenants needs to know which one they are in before they read anything else.
 */
export function Sidebar({ groups, tenantName }: { groups: NavigationGroup[]; tenantName: string }) {
  return (
    <aside className="hidden w-56 shrink-0 flex-col bg-[var(--color-rail)] px-3 py-4 md:flex">
      <div className="mb-5 flex items-center gap-2 border-b border-[var(--color-rail-line)] pb-4">
        <Image
          src="/brand/monogram.png"
          alt=""
          width={28}
          height={28}
          priority
          className="h-6 w-6 rounded object-contain"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--color-rail-ink)]">{tenantName}</p>
          <p className="text-[11px] text-[var(--color-rail-ink-muted)]">COEX</p>
        </div>
      </div>

      <NavigationTree groups={groups} />
    </aside>
  );
}

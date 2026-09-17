import type { NavigationGroup } from './navigation';
import { NavigationTree } from './navigation-tree';

/**
 * The panel beside the rail.
 *
 * Light rather than dark, so the eye travels from the dark rail into the working area without a
 * second heavy block in the middle. It holds the workspace name, a way to add something, and the
 * list of what is inside the current area.
 */
export function Sidebar({ groups, tenantName }: { groups: NavigationGroup[]; tenantName: string }) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-surface)] md:flex">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{tenantName}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-6">
        <NavigationTree groups={groups} />
      </div>
    </aside>
  );
}

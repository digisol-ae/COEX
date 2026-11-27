'use client';
import type { ModuleAllowance } from '@coex/shared/core/modules';
export function ModuleFields({ defaults }: { defaults: ModuleAllowance }) {
  return (
    <fieldset className="space-y-2 rounded-lg border border-[var(--color-line)] p-3">
      <legend className="px-1 text-sm font-medium">Included modules</legend>
      {(
        [
          ['tasks', 'Tasks and time'],
          ['tickets', 'Support and customer resources'],
          ['crm', 'Sales CRM: products, leads, opportunities and contracts'],
          ['payroll', 'Payroll (explicit enablement required)'],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="flex gap-2 text-sm">
          <input type="checkbox" name={`module_${key}`} defaultChecked={defaults[key]} />
          {label}
        </label>
      ))}
      <p className="text-xs text-[var(--color-ink-muted)]">
        Customer organisations and contacts remain available. Turning modules off preserves their
        records and pauses their public links and background work. Stop affected running timers
        first.
      </p>
    </fieldset>
  );
}

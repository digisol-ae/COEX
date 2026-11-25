'use client';
import { ModuleFields } from './module-fields';
import { ALL_MODULES } from '@coex/shared/core/modules';
import { useActionState, useState } from 'react';
import { Button, Card, CardSection, Field, Input, Notice, Select } from '@/components/ui';
import { SettingsDrawer } from '@/components/ui/settings-drawer';
import { formatStorage, formatPlanPrice } from '@coex/shared/core/saas';
import type { PlanOption } from '@/modules/core/services/plan-catalogue.service';
import { planAction } from './plan-actions';
export function PlanCatalogue({ plans }: { plans: PlanOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardSection title="Subscription plans">
        <p className="mb-3 text-sm text-[var(--color-ink-muted)]">
          Prices are for the whole workspace per month or year. Publishing a version does not charge
          customers or change existing subscriptions. Each version records its included modules.
        </p>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Publish plan version
        </Button>
        {plans.length === 0 && (
          <p className="mt-3 text-sm">
            No plans published yet. Set your own prices and allowances.
          </p>
        )}
        <ul className="mt-3 space-y-3">
          {plans.map((plan) => (
            <li key={plan.id} className="rounded-lg border border-[var(--color-line)] p-3">
              <p className="font-medium">
                {plan.name} · {plan.code} v{plan.version}
                {!plan.active && ' · Archived'}
              </p>
              <p className="text-sm">
                {formatPlanPrice(plan)} · {plan.seats} staff seats ·{' '}
                {formatStorage(plan.storageLimitBytes)}
              </p>
              <p className="text-sm">
                Modules:{' '}
                {Object.entries(plan.modules)
                  .filter(([, enabled]) => enabled)
                  .map(([key]) =>
                    key === 'tasks'
                      ? 'Tasks and time'
                      : key === 'tickets'
                        ? 'Support'
                        : 'Sales CRM',
                  )
                  .join(', ') || 'Foundations only'}
              </p>
              {plan.active && <ArchivePlan plan={plan} />}
            </li>
          ))}
        </ul>
        {open && <PublishPlan onClose={() => setOpen(false)} />}
      </CardSection>
    </Card>
  );
}
function PublishPlan({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState(planAction, {});
  const [dirty, setDirty] = useState(false);
  const saved = state.saved && !dirty && !state.error;
  return (
    <SettingsDrawer title="Publish plan version" open onClose={onClose}>
      <form
        action={action}
        onChange={() => setDirty(true)}
        onSubmit={() => setDirty(false)}
        className="space-y-3"
      >
        <input type="hidden" name="operation" value="publish" />
        <Notice>
          Published terms cannot be edited. Use the same code with a new version for revised terms.
          Existing customers retain their assigned version.
        </Notice>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Plan code">
            <Input name="code" pattern="[a-z0-9-]{2,40}" maxLength={40} required />
          </Field>
          <Field label="Version">
            <Input name="version" type="number" min="1" max="100000" defaultValue="1" required />
          </Field>
          <Field label="Plan name">
            <Input name="name" maxLength={80} required />
          </Field>
          <Field label="Currency" hint="For example AED, USD or PKR.">
            <Input name="currency" minLength={3} maxLength={3} required />
          </Field>
          <Field label="Price per workspace">
            <Input name="price" type="number" min="0" step="0.0001" required />
          </Field>
          <Field label="Billing interval">
            <Select name="interval" defaultValue="month">
              <option value="month">Monthly</option>
              <option value="year">Annual</option>
            </Select>
          </Field>
          <Field label="Staff seats">
            <Input name="seats" type="number" min="1" max="100000" required />
          </Field>
          <Field label="Storage allowance (GB)">
            <Input
              name="storageGB"
              type="number"
              min="0.001"
              step="0.001"
              defaultValue="2"
              required
            />
          </Field>
        </div>
        <ModuleFields defaults={ALL_MODULES} />
        <Field label="Reason">
          <Input name="reason" maxLength={500} required />
        </Field>
        {state.error && <Notice tone="alert">{state.error}</Notice>}
        {saved && <Notice tone="ok">Plan version published.</Notice>}
        <Button
          type={saved ? 'button' : 'submit'}
          disabled={pending}
          onClick={() => {
            if (saved) onClose();
          }}
        >
          {saved ? 'Close' : 'Publish version'}
        </Button>
      </form>
    </SettingsDrawer>
  );
}
function ArchivePlan({ plan }: { plan: PlanOption }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(planAction, {});
  if (!open)
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Archive version
      </Button>
    );
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="operation" value="archive" />
      <input type="hidden" name="planId" value={plan.id} />
      <Field
        label={`Reason for archiving ${plan.code} v${plan.version}`}
        hint="Existing subscriptions keep their terms. New assignments will be blocked."
      >
        <Input name="reason" maxLength={500} required />
      </Field>
      {state.error && <Notice tone="alert">{state.error}</Notice>}
      <Button type="submit" disabled={pending}>
        Archive version
      </Button>{' '}
      <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}

'use client';
import { ModuleFields } from './module-fields';
import type { ModuleAllowance } from '@coex/shared/core/modules';
import type { PlanOption } from '@/modules/core/services/plan-catalogue.service';
import { formatPlanPrice } from '@coex/shared/core/saas';
import { useActionState, useState } from 'react';
import { SettingsDrawer } from '@/components/ui/settings-drawer';
import { Button, Card, CardSection, Field, Input, Notice, Select } from '@/components/ui';
import { platformChangeAction } from './actions';

export function ProvisioningDefaults({
  trialDays,
  storageLimitBytes,
}: {
  trialDays: number;
  storageLimitBytes: number;
}) {
  const [state, action, pending] = useActionState(platformChangeAction, {});
  const [dirty, setDirty] = useState(false);
  return (
    <Card>
      <CardSection title="New workspace defaults">
        <form
          action={action}
          onChange={() => setDirty(true)}
          onSubmit={() => setDirty(false)}
          className="space-y-3"
        >
          <input type="hidden" name="operation" value="defaults" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Trial days" hint="Starts when the workspace is created after approval.">
              <Input
                name="trialDays"
                type="number"
                min="1"
                max="365"
                defaultValue={trialDays}
                required
              />
            </Field>
            <Field
              label="Storage allowance (GB)"
              hint="1 GB = 1,000,000,000 bytes. Existing tenants keep their allowance."
            >
              <Input
                name="storageGB"
                type="number"
                min="0.001"
                step="0.001"
                defaultValue={storageLimitBytes / 1_000_000_000}
                required
              />
            </Field>
          </div>
          {state.error && <Notice tone="alert">{state.error}</Notice>}
          {state.saved && !dirty && <Notice tone="ok">Defaults saved.</Notice>}
          <Button type="submit" disabled={pending}>
            Save defaults
          </Button>
        </form>
      </CardSection>
    </Card>
  );
}

export function TenantCommercialControls({
  tenantId,
  tenantName,
  storageLimitBytes,
  trial,
  subscription,
  modules,
  effectiveModules,
  plans,
}: {
  tenantId: string;
  modules: ModuleAllowance;
  effectiveModules: ModuleAllowance;
  tenantName: string;
  storageLimitBytes: number;
  trial: boolean;
  plans: PlanOption[];
  subscription: { plan: string | null; seats: number | null; status: string; accessEndsAt: string };
}) {
  const [open, setOpen] = useState(false);
  const [operation, setOperation] = useState('storage');
  const [dirty, setDirty] = useState(false);
  const [state, action, pending] = useActionState(platformChangeAction, {});
  if (!open)
    return (
      <Button
        variant="secondary"
        onClick={() => {
          setOpen(true);
          setDirty(false);
        }}
      >
        Manage
      </Button>
    );
  const saved = state.saved && !dirty && !state.error;
  return (
    <SettingsDrawer title={`Manage ${tenantName}`} open={open} onClose={() => setOpen(false)}>
      <form
        key={operation}
        action={action}
        onChange={() => setDirty(true)}
        onSubmit={() => setDirty(false)}
        className="min-w-52 space-y-2"
      >
        <input type="hidden" name="tenantId" value={tenantId} />
        <Field label="Change">
          <Select
            name="operation"
            defaultValue={operation}
            onChange={(event) => setOperation(event.target.value)}
          >
            <option value="storage">Storage allowance</option>
            <option value="modules">Module access</option>
            <option value="subscription">Manual subscription</option>
            <option value="assign-plan">Assign catalogue plan</option>
            {trial && <option value="extend">Extend trial</option>}
          </Select>
        </Field>
        {operation === 'modules' ? (
          <>
            <ModuleFields defaults={modules} />
            <p className="text-sm">
              Current effective access:{' '}
              {Object.entries(effectiveModules)
                .filter(([, enabled]) => enabled)
                .map(([key]) =>
                  key === 'tickets' ? 'Support' : key === 'tasks' ? 'Tasks and time' : 'Sales CRM',
                )
                .join(', ') || 'Foundations only'}
              . Modules excluded by the assigned plan cannot be enabled here.
            </p>
          </>
        ) : operation === 'assign-plan' ? (
          <>
            <Field
              label="Plan version"
              hint="Assigns its staff and storage allowances, records its price and activates access. No payment is collected."
            >
              <Select name="planId" required defaultValue="">
                <option value="" disabled>
                  Choose a published plan
                </option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} v{plan.version} · {formatPlanPrice(plan)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Access through (UTC)">
              <Input
                name="accessEndsAt"
                type="date"
                defaultValue={subscription.accessEndsAt}
                required
              />
            </Field>
          </>
        ) : operation === 'subscription' ? (
          <>
            <Field label="Plan name">
              <Input name="plan" maxLength={80} defaultValue={subscription.plan ?? ''} required />
            </Field>
            <Field
              label="Staff seats"
              hint="Active and invited staff count. Customer portal accounts are separate."
            >
              <Input
                name="seats"
                type="number"
                min="1"
                max="100000"
                defaultValue={subscription.seats ?? 1}
                required
              />
            </Field>
            <Field
              label="Subscription status"
              hint="Past due and canceled block access immediately. No records are deleted."
            >
              <Select
                name="subscriptionStatus"
                defaultValue={
                  ['active', 'past_due', 'canceled'].includes(subscription.status)
                    ? subscription.status
                    : 'active'
                }
              >
                <option value="active">Active</option>
                <option value="past_due">Past due</option>
                <option value="canceled">Canceled</option>
              </Select>
            </Field>
            <Field
              label="Access through (UTC)"
              hint="Active access ends at the end of this date. Saving does not charge the customer."
            >
              <Input
                name="accessEndsAt"
                type="date"
                defaultValue={subscription.accessEndsAt}
                required
              />
            </Field>
          </>
        ) : operation === 'storage' ? (
          <Field label="Storage allowance (GB)">
            <Input
              name="storageGB"
              type="number"
              min="0.001"
              step="0.001"
              defaultValue={storageLimitBytes / 1_000_000_000}
              required
            />
          </Field>
        ) : (
          <Field label="Additional days">
            <Input name="days" type="number" min="1" max="3650" defaultValue="30" required />
          </Field>
        )}
        <Field label="Reason">
          <Input name="reason" maxLength={500} required />
        </Field>
        {state.error && <Notice tone="alert">{state.error}</Notice>}
        {saved && <Notice tone="ok">Saved.</Notice>}
        <div className="flex gap-2">
          <Button
            type={saved ? 'button' : 'submit'}
            disabled={pending}
            onClick={() => {
              if (saved) setOpen(false);
            }}
          >
            {saved ? 'Close' : 'Save'}
          </Button>
          {!saved && (
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </SettingsDrawer>
  );
}

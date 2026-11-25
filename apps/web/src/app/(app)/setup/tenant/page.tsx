import { effectiveModules } from '@coex/shared/core/modules';
import { subscriptionUsage } from '@/modules/core/services/subscription.service';
import { SettingsDrawer } from '@/components/ui/settings-drawer';
import { asUser, requirePermission } from '@/lib/session';
import {
  getCurrentTenant,
  listContractProviderSigners,
} from '@/modules/core/services/tenant.service';
import { Card, CardSection, PageHeader } from '@/components/ui';
import { initialiseStorageUsage } from '@/lib/storage';
import {
  DEFAULT_STORAGE_LIMIT_BYTES,
  formatStorage,
  formatPlanPrice,
} from '@coex/shared/core/saas';
import { TenantSettingsForm } from './settings-form';

export const metadata = { title: 'Tenant settings · Worktello' };

/** Minutes from midnight to the 09:00 form a time input expects. */
function toTimeInput(minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  return `${hours}:${String(minutes % 60).padStart(2, '0')}`;
}

export default async function TenantSettingsPage() {
  const actor = await requirePermission('tenant.manage');
  const [tenant, staff] = await asUser(actor, () =>
    Promise.all([getCurrentTenant(), listContractProviderSigners()]),
  );
  const usage = await asUser(actor, () => initialiseStorageUsage(String(tenant._id)));
  const membershipUsage = await asUser(actor, subscriptionUsage);
  const allowance = tenant.storageLimitBytes ?? DEFAULT_STORAGE_LIMIT_BYTES;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Tenant settings"
        description="Applies to everyone in this tenant. Numbering prefixes appear on every task and ticket number."
      />

      <Card className="mb-4">
        <CardSection title="Workspace allowance">
          <p className="mb-2 text-sm">
            Available modules:{' '}
            {Object.entries(effectiveModules(tenant))
              .filter(([, enabled]) => enabled)
              .map(([key]) =>
                key === 'tickets' ? 'Support' : key === 'tasks' ? 'Tasks and time' : 'Sales CRM',
              )
              .join(', ') || 'Foundations only'}
            .
          </p>
          {tenant.commercial?.planSnapshot && (
            <p className="mb-2 text-sm">
              Assigned terms: {tenant.commercial.planSnapshot.code} v
              {tenant.commercial.planSnapshot.version} ·{' '}
              {formatPlanPrice(tenant.commercial.planSnapshot)}. Allowances may include
              owner-approved overrides.
            </p>
          )}
          <p className="text-sm">
            Plan: {tenant.commercial?.plan ?? 'Unassigned'}. Staff seats: {membershipUsage.staff} /{' '}
            {tenant.commercial?.seats ?? 'Unconfigured'}. Customer portal accounts:{' '}
            {membershipUsage.portal}.
          </p>
          {tenant.commercial?.accessEndsAt && (
            <p className="mt-2 text-sm">
              Subscription access through (UTC):{' '}
              {tenant.commercial.accessEndsAt.toLocaleDateString('en-GB', { timeZone: 'UTC' })}.
            </p>
          )}
          <p className="text-sm">
            Storage: {formatStorage(usage)} used of {formatStorage(allowance)}.
          </p>
          <progress
            className="mt-2 w-full"
            aria-label="Workspace storage used"
            max={allowance}
            value={Math.min(usage, allowance)}
          />
          {tenant.commercial?.status === 'trialing' && tenant.commercial?.trialEndsAt && (
            <p className="mt-2 text-sm">
              Trial ends:{' '}
              {tenant.commercial.trialEndsAt.toLocaleDateString('en-GB', {
                timeZone: tenant.timezone ?? 'UTC',
              })}
              .
            </p>
          )}
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            Contact the platform owner to change your allowance or extend your trial.
          </p>
        </CardSection>
      </Card>
      <SettingsDrawer
        title="Workspace settings"
        summary="Numbering, working hours, currency and retention"
      >
        <TenantSettingsForm
          staff={staff.map(({ _id, name }) => ({ id: String(_id), name }))}
          defaults={{
            name: tenant.name,
            slug: tenant.slug,
            timezone: tenant.timezone ?? 'Asia/Dubai',
            currency: tenant.currency ?? 'AED',
            taskPrefix: tenant.numbering?.taskPrefix ?? 'T',
            ticketPrefix: tenant.numbering?.ticketPrefix ?? 'S',
            leadPrefix: tenant.numbering?.leadPrefix ?? 'L',
            opportunityPrefix: tenant.numbering?.opportunityPrefix ?? 'O',
            leadSources: tenant.leadSources.join('\n'),
            attachmentRetentionMonths: tenant.attachmentRetentionMonths ?? 24,
            workingDays: tenant.workingDays ?? [1, 2, 3, 4, 5],
            dayStart: toTimeInput(tenant.dayStartMinutes ?? 540),
            dayEnd: toTimeInput(tenant.dayEndMinutes ?? 1080),
            agreementSupportPortal: tenant.agreementDefaults?.supportPortal ?? '',
            agreementSupportEmail: tenant.agreementDefaults?.supportEmail ?? '',
            agreementSupportPhone: tenant.agreementDefaults?.supportPhone ?? '',
            agreementSupportWhatsapp: tenant.agreementDefaults?.supportWhatsapp ?? '',
            agreementProviderSignerId: String(tenant.agreementDefaults?.providerSignerId ?? ''),
            letterheadAddress: tenant.branding?.letterhead?.address ?? '',
            letterheadContact: tenant.branding?.letterhead?.contact ?? '',
            letterheadFooter: tenant.branding?.letterhead?.footer ?? '',
            letterheadLogo: tenant.branding?.letterhead?.logoDataUrl ?? '',
            letterheadColor: tenant.branding?.primaryColor ?? '#0f172a',
          }}
        />
      </SettingsDrawer>
    </div>
  );
}

import { SettingsDrawer } from '@/components/ui/settings-drawer';
import { asUser, requirePermission } from '@/lib/session';
import {
  getCurrentTenant,
  listContractProviderSigners,
} from '@/modules/core/services/tenant.service';
import { PageHeader } from '@/components/ui';
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

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Tenant settings"
        description="Applies to everyone in this tenant. Numbering prefixes appear on every task and ticket number."
      />

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

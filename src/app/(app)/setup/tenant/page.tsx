import { asUser, requirePermission } from '@/lib/session';
import { getCurrentTenant } from '@/modules/core/services/tenant.service';
import { PageHeader } from '@/components/ui';
import { TenantSettingsForm } from './settings-form';

export const metadata = { title: 'Tenant settings · COEX' };

export default async function TenantSettingsPage() {
  const actor = await requirePermission('tenant.manage');
  const tenant = await asUser(actor, getCurrentTenant);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Tenant settings"
        description="Applies to everyone in this tenant. Numbering prefixes appear on every task and ticket number."
      />

      <TenantSettingsForm
        defaults={{
          name: tenant.name,
          slug: tenant.slug,
          timezone: tenant.timezone ?? 'Asia/Dubai',
          currency: tenant.currency ?? 'AED',
          taskPrefix: tenant.numbering?.taskPrefix ?? 'T',
          ticketPrefix: tenant.numbering?.ticketPrefix ?? 'S',
          attachmentRetentionMonths: tenant.attachmentRetentionMonths ?? 24,
        }}
      />
    </div>
  );
}

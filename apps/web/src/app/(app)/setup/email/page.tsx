import { SettingsDrawer } from '@/components/ui/settings-drawer';
import { asUser, requirePermission } from '@/lib/session';
import { PageHeader } from '@/components/ui';
import { getEmailSettings } from '@/modules/core/services/email.service';
import { listQueues } from '@/modules/tickets/services/queue.service';
import { EmailSettingsForm } from './email-settings-form';

export const metadata = { title: 'Email · Worktello' };

export default async function EmailSettingsPage() {
  const actor = await requirePermission('tenant.manage');
  const { settings, queues } = await asUser(actor, async () => ({
    settings: await getEmailSettings(),
    queues: await listQueues(),
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Email"
        description="The support mailbox Worktello reads, the account it sends from, what customers receive and which alerts staff get."
      />
      <SettingsDrawer
        title="Email settings"
        summary="Mailbox, sending identities, templates and staff alerts"
      >
        <EmailSettingsForm
          settings={settings}
          queues={queues.map((queue) => ({
            id: queue.id,
            name: queue.name,
            signature: queue.signature,
            autoSign: queue.autoSign,
          }))}
        />
      </SettingsDrawer>
    </div>
  );
}

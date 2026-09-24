import { asUser, requirePermission } from '@/lib/session';
import { PageHeader } from '@/components/ui';
import { getEmailSettings } from '@/modules/core/services/email.service';
import { listQueues } from '@/modules/tickets/services/queue.service';
import { EmailSettingsForm } from './email-settings-form';

export const metadata = { title: 'Email · COEX' };

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
        description="The support mailbox COEX reads, the account it sends from, what customers receive and which alerts staff get."
      />
      <EmailSettingsForm
        settings={settings}
        queues={queues.map((queue) => ({ id: queue.id, name: queue.name }))}
      />
    </div>
  );
}

import { asUser, requirePermission } from '@/lib/session';
import { PageHeader } from '@/components/ui';
import { getChannelSettings } from '@/modules/channels/services/channel-settings.service';
import { recentChannelMessages } from '@/modules/channels/services/channel-messages.service';
import { listQueues } from '@/modules/tickets/services/queue.service';
import { WhatsAppSettingsForm } from './whatsapp-settings-form';

export const metadata = { title: 'WhatsApp · COEX' };

export default async function WhatsAppSettingsPage() {
  const actor = await requirePermission('tenant.manage');
  const { settings, queues, messages } = await asUser(actor, async () => ({
    settings: await getChannelSettings(),
    queues: await listQueues(),
    messages: await recentChannelMessages(),
  }));
  const appUrl = (
    process.env.COEX_APP_URL ??
    process.env.AUTH_URL ??
    'http://localhost:3100'
  ).replace(/\/+$/, '');

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="WhatsApp"
        description="The Support and CRM WhatsApp numbers, the XVERSE connection and which messages customers receive."
      />
      <WhatsAppSettingsForm
        settings={settings}
        queues={queues.map((queue) => ({ id: queue.id, name: queue.name }))}
        messages={messages}
        endpointBase={`${appUrl}/api/channels/${settings.tenantSlug}`}
      />
    </div>
  );
}

'use server';

import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import {
  rotateSigningSecret,
  saveChannelSettings,
} from '@/modules/channels/services/channel-settings.service';
import {
  queueChannelMessage,
  simulateInbound,
} from '@/modules/channels/services/channel-messages.service';

export interface ChannelFormState {
  error?: string;
  saved?: boolean;
  message?: string;
  secret?: string;
}

const text = (formData: FormData, name: string) => String(formData.get(name) ?? '');
const flag = (formData: FormData, name: string) => formData.get(name) === 'on';
const failed = (error: unknown): ChannelFormState => ({
  error: error instanceof Error ? error.message : 'Something went wrong.',
});

export async function saveChannelSettingsAction(
  _previous: ChannelFormState,
  formData: FormData,
): Promise<ChannelFormState> {
  const actor = await requirePermission('tenant.manage');
  try {
    await asUser(actor, () =>
      saveChannelSettings({
        enabled: flag(formData, 'enabled'),
        provider: text(formData, 'provider') === 'xverse' ? 'xverse' : 'mock',
        delivery: text(formData, 'delivery') === 'pull' ? 'pull' : 'push',
        xverseBaseUrl: text(formData, 'xverseBaseUrl'),
        xverseApiKey: text(formData, 'xverseApiKey'),
        support: {
          enabled: flag(formData, 'supportEnabled'),
          number: text(formData, 'supportNumber'),
          queueId: text(formData, 'supportQueueId') || null,
        },
        crm: { enabled: flag(formData, 'crmEnabled'), number: text(formData, 'crmNumber') },
        notifications: {
          assigned: flag(formData, 'notifyAssigned'),
          awaitingReply: flag(formData, 'notifyAwaitingReply'),
          resolved: flag(formData, 'notifyResolved'),
          closed: flag(formData, 'notifyClosed'),
        },
      }),
    );
  } catch (error) {
    return failed(error);
  }
  revalidatePath('/setup/whatsapp');
  return { saved: true };
}

export async function rotateSecretAction(): Promise<ChannelFormState> {
  const actor = await requirePermission('tenant.manage');
  try {
    const secret = await asUser(actor, () => rotateSigningSecret());
    revalidatePath('/setup/whatsapp');
    return { secret };
  } catch (error) {
    return failed(error);
  }
}

export async function simulateInboundAction(
  account: 'support' | 'crm',
  from: string,
  body: string,
): Promise<ChannelFormState> {
  const actor = await requirePermission('tenant.manage');
  try {
    const result = await asUser(actor, () => simulateInbound({ account, from, text: body }));
    revalidatePath('/setup/whatsapp');
    if (result.rejected.length) return { error: result.rejected[0].error };
    return { message: 'Test message received.' };
  } catch (error) {
    return failed(error);
  }
}

export async function queueTestMessageAction(
  account: 'support' | 'crm',
  to: string,
  body: string,
): Promise<ChannelFormState> {
  const actor = await requirePermission('tenant.manage');
  try {
    await asUser(actor, () => queueChannelMessage({ account, to, kind: 'text', text: body }));
    revalidatePath('/setup/whatsapp');
    return { message: 'Test message queued. The channel worker sends it within ten seconds.' };
  } catch (error) {
    return failed(error);
  }
}

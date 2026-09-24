'use server';

import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import {
  saveEmailSettings,
  sendTestEmail,
  testMailboxConnection,
} from '@/modules/core/services/email.service';

export interface EmailFormState {
  error?: string;
  saved?: boolean;
  message?: string;
}

const text = (formData: FormData, name: string) => String(formData.get(name) ?? '');
const flag = (formData: FormData, name: string) => formData.get(name) === 'on';

export async function saveEmailSettingsAction(
  _previous: EmailFormState,
  formData: FormData,
): Promise<EmailFormState> {
  const actor = await requirePermission('tenant.manage');

  try {
    await asUser(actor, () =>
      saveEmailSettings({
        inbound: {
          enabled: flag(formData, 'inboundEnabled'),
          host: text(formData, 'inboundHost'),
          port: Number(text(formData, 'inboundPort')) || 993,
          secure: flag(formData, 'inboundSecure'),
          username: text(formData, 'inboundUsername'),
          password: text(formData, 'inboundPassword'),
          queueId: text(formData, 'inboundQueueId') || null,
        },
        outbound: {
          enabled: flag(formData, 'outboundEnabled'),
          host: text(formData, 'outboundHost'),
          port: Number(text(formData, 'outboundPort')) || 465,
          secure: flag(formData, 'outboundSecure'),
          username: text(formData, 'outboundUsername'),
          password: text(formData, 'outboundPassword'),
          fromName: text(formData, 'fromName'),
          fromAddress: text(formData, 'fromAddress'),
        },
        customer: {
          autoReplyEnabled: flag(formData, 'autoReplyEnabled'),
          autoReplySubject: text(formData, 'autoReplySubject'),
          autoReplyBody: text(formData, 'autoReplyBody'),
          emailPublicReplies: flag(formData, 'emailPublicReplies'),
        },
        staff: {
          ticketAssigned: flag(formData, 'ticketAssigned'),
          customerReplied: flag(formData, 'customerReplied'),
          taskAssigned: flag(formData, 'taskAssigned'),
        },
      }),
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the email settings.' };
  }

  revalidatePath('/setup/email');
  return { saved: true };
}

export async function testMailboxAction(): Promise<EmailFormState> {
  const actor = await requirePermission('tenant.manage');
  try {
    return { message: await asUser(actor, testMailboxConnection) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not reach the mailbox.' };
  }
}

export async function sendTestEmailAction(): Promise<EmailFormState> {
  const actor = await requirePermission('tenant.manage');
  try {
    return { message: await asUser(actor, sendTestEmail) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not send the test email.' };
  } finally {
    revalidatePath('/setup/email');
  }
}

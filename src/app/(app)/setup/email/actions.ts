'use server';

import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import {
  saveEmailSettings,
  sendTestEmail,
  testMailboxConnection,
  type NewTicketAlert,
  type SenderInput,
  type SenderRole,
} from '@/modules/core/services/email.service';

export interface EmailFormState {
  error?: string;
  saved?: boolean;
  message?: string;
}

const text = (formData: FormData, name: string) => String(formData.get(name) ?? '');
const flag = (formData: FormData, name: string) => formData.get(name) === 'on';

/** The Alert or Admin sender's fields, which the form names with that prefix. */
function template(formData: FormData, key: 'renewal' | 'expired' | 'general') {
  return {
    subject: text(formData, `template_${key}_subject`),
    body: text(formData, `template_${key}_body`),
  };
}

function sender(formData: FormData, prefix: 'alert' | 'admin' | 'contracts'): SenderInput {
  return {
    fromName: text(formData, `${prefix}FromName`),
    fromAddress: text(formData, `${prefix}FromAddress`),
    ownAccount: flag(formData, `${prefix}OwnAccount`),
    host: text(formData, `${prefix}Host`),
    port: Number(text(formData, `${prefix}Port`)) || 465,
    secure: flag(formData, `${prefix}Secure`),
    username: text(formData, `${prefix}Username`),
    password: text(formData, `${prefix}Password`),
  };
}

function newTicketAlert(value: string): NewTicketAlert {
  return value === 'off' || value === 'desk' ? value : 'admins';
}

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
        senders: {
          alert: sender(formData, 'alert'),
          admin: sender(formData, 'admin'),
          contracts: sender(formData, 'contracts'),
        },
        contractTemplates: {
          renewal: template(formData, 'renewal'),
          expired: template(formData, 'expired'),
          general: template(formData, 'general'),
        },
        customer: {
          autoReplyEnabled: flag(formData, 'autoReplyEnabled'),
          autoReplyBody: text(formData, 'autoReplyBody'),
          emailPublicReplies: flag(formData, 'emailPublicReplies'),
        },
        staff: {
          ticketAssigned: flag(formData, 'ticketAssigned'),
          customerReplied: flag(formData, 'customerReplied'),
          taskAssigned: flag(formData, 'taskAssigned'),
          mentioned: flag(formData, 'mentioned'),
          contractRenewal: flag(formData, 'contractRenewal'),
          nextStepDue: flag(formData, 'nextStepDue'),
          opportunityStale: flag(formData, 'opportunityStale'),
          ticketCreated: newTicketAlert(text(formData, 'ticketCreated')),
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

export async function sendTestEmailAction(role: SenderRole = 'standard'): Promise<EmailFormState> {
  const actor = await requirePermission('tenant.manage');
  try {
    return { message: await asUser(actor, () => sendTestEmail(role)) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not send the test email.' };
  } finally {
    revalidatePath('/setup/email');
  }
}

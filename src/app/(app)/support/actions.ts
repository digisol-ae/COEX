'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { asUser, requirePermission } from '@/lib/session';
import {
  addReply,
  assignTicket,
  changeStatus,
  createFollowOn,
  createTicket,
  escalateToTask,
  linkTickets,
  mergeTickets,
  moveTicketToQueue,
  setTicketPriority,
  unlinkTickets,
  type Priority,
  type TicketStatus,
} from '@/modules/tickets/services/ticket.service';
import {
  archiveCannedReply,
  createCannedReply,
  recordCannedReplyUse,
  restoreCannedReply,
  updateCannedReply,
} from '@/modules/tickets/services/canned-reply.service';
import { attachToMessage, type IncomingFile } from '@/modules/tickets/services/attachment.service';
import {
  archiveQueue,
  createQueue,
  restoreQueue,
  updateQueue,
  type QueueTarget,
} from '@/modules/tickets/services/queue.service';

export interface SupportFormState {
  error?: string;
  saved?: boolean;
}

const PRIORITIES = ['urgent', 'high', 'normal', 'low'] as const;
const STATUSES = ['new', 'open', 'pending_customer', 'escalated', 'resolved', 'closed'] as const;

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? '').trim();
}

/**
 * Files off a form, read into memory once.
 *
 * A support attachment is a screenshot or a log, not a video, and the service refuses anything
 * beyond its own limit, so reading the whole file is simpler than streaming and has a ceiling.
 */
async function incomingFiles(formData: FormData): Promise<IncomingFile[]> {
  const files: IncomingFile[] = [];

  for (const entry of formData.getAll('files')) {
    if (typeof entry === 'string') continue;
    if (entry.size === 0) continue;

    files.push({
      fileName: entry.name,
      contentType: entry.type || 'application/octet-stream',
      body: Buffer.from(await entry.arrayBuffer()),
    });
  }

  return files;
}

function toPriority(value: string): Priority {
  return (PRIORITIES as readonly string[]).includes(value) ? (value as Priority) : 'normal';
}

function refreshTicket(id: string): void {
  revalidatePath(`/support/tickets/${id}`);
  revalidatePath('/support/tickets');
  revalidatePath('/support/metrics');
  revalidatePath('/dashboard');
}

export async function createTicketAction(
  _previous: SupportFormState,
  formData: FormData,
): Promise<SupportFormState> {
  const actor = await requirePermission('ticket.manage');

  let id: string;

  try {
    const created = await asUser(actor, () =>
      createTicket({
        subject: text(formData, 'subject'),
        body: text(formData, 'body'),
        queueId: text(formData, 'queueId'),
        priority: toPriority(text(formData, 'priority')),
        organisationId: text(formData, 'organisationId') || null,
        contactId: text(formData, 'contactId') || null,
        productId: text(formData, 'productId') || null,
        channel: 'agent',
        onBehalfOfCustomer: text(formData, 'onBehalf') !== 'no',
      }),
    );

    id = created.id;

    const files = await incomingFiles(formData);
    if (files.length > 0) {
      await asUser(actor, () => attachToMessage(created.firstMessageId, files));
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not raise the ticket.' };
  }

  revalidatePath('/support/tickets');
  redirect(`/support/tickets/${id}`);
}

/**
 * A reply or an internal note.
 *
 * Visibility is sent explicitly and never defaulted. Guessing it wrong once, in front of a client,
 * costs more than every other bug in this module put together.
 */
export async function replyAction(
  _previous: SupportFormState,
  formData: FormData,
): Promise<SupportFormState> {
  const actor = await requirePermission('ticket.manage');

  const id = text(formData, 'ticketId');
  const visibility = text(formData, 'visibility');

  if (visibility !== 'public' && visibility !== 'internal') {
    return { error: 'Choose whether this goes to the customer or stays internal.' };
  }

  const body = text(formData, 'body');
  if (!body) return { error: 'There is nothing to send.' };

  const files = await incomingFiles(formData);

  try {
    await asUser(actor, async () => {
      const messageId = await addReply({ ticketId: id, body, visibility });

      if (files.length > 0) await attachToMessage(messageId, files);

      const usedReplyId = text(formData, 'cannedReplyId');
      if (usedReplyId) await recordCannedReplyUse(usedReplyId);
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not send the reply.' };
  }

  refreshTicket(id);
  return { saved: true };
}

export async function setStatusAction(input: {
  id: string;
  status: TicketStatus;
}): Promise<SupportFormState> {
  const actor = await requirePermission('ticket.manage');

  try {
    await asUser(actor, () => changeStatus(input.id, input.status));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not change the status.' };
  }

  refreshTicket(input.id);
  return { saved: true };
}

export async function assignAction(input: {
  id: string;
  userId: string | null;
}): Promise<SupportFormState> {
  const actor = await requirePermission('ticket.manage');

  try {
    await asUser(actor, () => assignTicket(input.id, input.userId));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not assign the ticket.' };
  }

  refreshTicket(input.id);
  return { saved: true };
}

export async function setPriorityAction(input: {
  id: string;
  priority: Priority;
}): Promise<SupportFormState> {
  const actor = await requirePermission('ticket.manage');

  try {
    await asUser(actor, () => setTicketPriority(input.id, input.priority));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not change the priority.' };
  }

  refreshTicket(input.id);
  return { saved: true };
}

export async function moveQueueAction(input: {
  id: string;
  queueId: string;
}): Promise<SupportFormState> {
  const actor = await requirePermission('ticket.manage');

  try {
    await asUser(actor, () => moveTicketToQueue(input.id, input.queueId));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not move the ticket.' };
  }

  refreshTicket(input.id);
  return { saved: true };
}

export async function escalateAction(
  _previous: SupportFormState,
  formData: FormData,
): Promise<SupportFormState> {
  const actor = await requirePermission('ticket.manage');
  const id = text(formData, 'ticketId');

  try {
    await asUser(actor, () =>
      escalateToTask({
        ticketId: id,
        spaceId: text(formData, 'spaceId'),
        title: text(formData, 'title') || undefined,
        assigneeIds: formData.getAll('assigneeIds').map(String).filter(Boolean),
      }),
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not escalate the ticket.' };
  }

  refreshTicket(id);
  revalidatePath('/spaces');
  revalidatePath('/tasks');
  return { saved: true };
}

export async function mergeAction(
  _previous: SupportFormState,
  formData: FormData,
): Promise<SupportFormState> {
  const actor = await requirePermission('ticket.manage');

  const sourceId = text(formData, 'sourceId');
  const targetId = text(formData, 'targetId');

  try {
    await asUser(actor, () => mergeTickets(sourceId, targetId));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not merge the tickets.' };
  }

  refreshTicket(sourceId);
  refreshTicket(targetId);
  return { saved: true };
}

export async function linkAction(
  _previous: SupportFormState,
  formData: FormData,
): Promise<SupportFormState> {
  const actor = await requirePermission('ticket.manage');

  const id = text(formData, 'ticketId');
  const otherId = text(formData, 'otherId');

  try {
    await asUser(actor, () => linkTickets(id, otherId));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not link the tickets.' };
  }

  refreshTicket(id);
  refreshTicket(otherId);
  return { saved: true };
}

export async function unlinkAction(input: {
  id: string;
  otherId: string;
}): Promise<SupportFormState> {
  const actor = await requirePermission('ticket.manage');

  await asUser(actor, () => unlinkTickets(input.id, input.otherId));

  refreshTicket(input.id);
  refreshTicket(input.otherId);
  return { saved: true };
}

/** Reopening a closed ticket, which is a new ticket carrying the old one's context. */
export async function followOnAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('ticket.manage');
  const id = text(formData, 'ticketId');

  const followOnId = await asUser(actor, () => createFollowOn(id));

  refreshTicket(id);
  redirect(`/support/tickets/${followOnId}`);
}

/* Queue administration. */

function targetsFrom(formData: FormData): QueueTarget[] {
  return (PRIORITIES as readonly Priority[]).map((priority) => ({
    priority,
    firstResponseMinutes: Math.round(Number(text(formData, `${priority}_first`) || 0) * 60),
    resolutionMinutes: Math.round(Number(text(formData, `${priority}_resolve`) || 0) * 60),
  }));
}

export async function saveQueueAction(
  _previous: SupportFormState,
  formData: FormData,
): Promise<SupportFormState> {
  const actor = await requirePermission('tenant.manage');
  const id = text(formData, 'id');

  const input = {
    name: text(formData, 'name'),
    description: text(formData, 'description') || null,
    signature: text(formData, 'signature') || null,
    productId: text(formData, 'productId') || null,
    memberIds: formData.getAll('memberIds').map(String).filter(Boolean),
    defaultAssigneeId: text(formData, 'defaultAssigneeId') || null,
    targets: targetsFrom(formData),
    isDefault: text(formData, 'isDefault') === 'on',
  };

  try {
    await asUser(actor, async () => {
      if (id) await updateQueue(id, input);
      else await createQueue(input);
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the queue.' };
  }

  revalidatePath('/setup/queues');
  revalidatePath('/support/tickets');
  return { saved: true };
}

export async function archiveQueueAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('tenant.manage');

  await asUser(actor, () => archiveQueue(text(formData, 'id')));

  revalidatePath('/setup/queues');
}

export async function restoreQueueAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('tenant.manage');

  await asUser(actor, () => restoreQueue(text(formData, 'id')));

  revalidatePath('/setup/queues');
}

/* Saved replies. */

export async function saveCannedReplyAction(
  _previous: SupportFormState,
  formData: FormData,
): Promise<SupportFormState> {
  const actor = await requirePermission('ticket.manage');
  const id = text(formData, 'id');

  const input = {
    title: text(formData, 'title'),
    body: text(formData, 'body'),
    queueId: text(formData, 'queueId') || null,
  };

  try {
    await asUser(actor, async () => {
      if (id) await updateCannedReply(id, input);
      else await createCannedReply(input);
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the reply.' };
  }

  revalidatePath('/setup/canned-replies');
  return { saved: true };
}

export async function archiveCannedReplyAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('ticket.manage');

  await asUser(actor, () => archiveCannedReply(text(formData, 'id')));

  revalidatePath('/setup/canned-replies');
}

export async function restoreCannedReplyAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('ticket.manage');

  await asUser(actor, () => restoreCannedReply(text(formData, 'id')));

  revalidatePath('/setup/canned-replies');
}

/** Kept for the status list the ticket screen offers, so it cannot drift from the service. */
export const TICKET_STATUSES = STATUSES;

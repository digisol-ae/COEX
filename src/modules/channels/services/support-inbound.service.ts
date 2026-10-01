import type { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { toObjectId } from '@/lib/ids';
import { openSecret } from '@/lib/secret-box';
import { getContext, runWithContext } from '@/lib/tenant-context';
import { TenantModel } from '@/modules/core/models/tenant.model';
import { alertStaff, appBaseUrl } from '@/modules/core/services/email.service';
import { ContactModel } from '@/modules/crm/models/contact.model';
import { OrganisationModel } from '@/modules/crm/models/organisation.model';
import { TicketMessageModel } from '@/modules/tickets/models/ticket-message.model';
import { TicketModel } from '@/modules/tickets/models/ticket.model';
import { attachToMessage } from '@/modules/tickets/services/attachment.service';
import { createTicket } from '@/modules/tickets/services/ticket.service';
import { ChannelMessageModel, type ChannelMessage } from '../models/channel-message.model';
import { ChannelSettingsModel } from '../models/channel-settings.model';
import { queueChannelMessage } from './channel-messages.service';

/**
 * M6.2: messages to the Support number become tickets (John, 1 Oct 2026).
 *
 * - A known contact's message joins their open WhatsApp ticket, or opens a new one.
 * - An unknown number opens a ticket too; the number and WhatsApp name are kept on the ticket
 *   until an agent links a contact.
 * - A message on a Resolved or Pending ticket reopens it. Nothing leaves Closed: a message after
 *   Closed opens a new ticket that refers back to the old one.
 * - Every new ticket gets the "Ticket received" WhatsApp reply, which is always on.
 */

export const MAX_PROCESS_ATTEMPTS = 5;
const LEASE_MS = 2 * 60 * 1000;
const MAX_MEDIA_BYTES = 16 * 1024 * 1024;

type Stored = ChannelMessage & { _id: Types.ObjectId };

/** The words an agent reads for one WhatsApp message, whatever its type. */
export function messageBody(message: {
  type: string;
  text?: string | null;
  media?: { fileName?: string | null; mimeType?: string | null } | null;
}): string {
  const text = message.text?.trim() ?? '';
  switch (message.type) {
    case 'text':
      return text || '(Empty message.)';
    case 'image':
    case 'video':
    case 'audio':
    case 'document': {
      const label =
        message.type === 'document'
          ? 'Document'
          : message.type[0].toUpperCase() + message.type.slice(1);
      const name = message.media?.fileName ? `: ${message.media.fileName}` : '';
      return text ? `${text}\n\n[${label}${name}]` : `[${label}${name}]`;
    }
    case 'location':
      return text ? `[Location] ${text}` : '[Location shared]';
    case 'contact':
      return text ? `[Contact card] ${text}` : '[Contact card shared]';
    default:
      return text || `[${message.type}]`;
  }
}

/** A ticket subject from the first message: who wrote, then the start of what they wrote. */
export function ticketSubject(sender: string, body: string): string {
  const firstLine = body.replace(/\s+/g, ' ').trim();
  const preview = firstLine.length > 60 ? `${firstLine.slice(0, 60).trimEnd()}…` : firstLine;
  return `WhatsApp from ${sender}: ${preview}`;
}

export function acknowledgementText(company: string, ticketNumber: string): string {
  return `Thank you for contacting ${company}. Your request is logged as ticket ${ticketNumber}. Our team will reply here shortly.`;
}

async function downloadMedia(
  url: string,
  apiKey: string | null,
): Promise<{ body: Buffer; contentType: string | null }> {
  const response = await fetch(url, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`The file could not be downloaded (HTTP ${response.status}).`);
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > MAX_MEDIA_BYTES) throw new Error('The file is larger than 16 MB.');
  const body = Buffer.from(await response.arrayBuffer());
  if (body.byteLength > MAX_MEDIA_BYTES) throw new Error('The file is larger than 16 MB.');
  return { body, contentType: response.headers.get('content-type') };
}

/** Claims a row so the webhook and the worker never turn the same message into two tickets. */
async function claim(id: Types.ObjectId): Promise<Stored | null> {
  const now = new Date();
  return (await ChannelMessageModel.findOneAndUpdate(
    {
      _id: id,
      processedAt: null,
      $or: [{ leaseUntil: null }, { leaseUntil: { $lt: now } }],
    },
    { $set: { leaseUntil: new Date(now.getTime() + LEASE_MS) } },
    { returnDocument: 'after' },
  ).lean()) as Stored | null;
}

async function handleSupportMessage(message: Stored): Promise<void> {
  const { tenantId } = getContext();
  const settings = await ChannelSettingsModel.findOne({ tenantId }).lean();
  const queueId = settings?.accounts?.support?.queueId;
  if (!queueId) throw new Error('No queue is set for WhatsApp tickets in Setup, WhatsApp.');

  const from = message.from;
  const senderName = message.profileName?.trim() || from;
  const body = messageBody(message);

  const contact = await ContactModel.findOne({ tenantId, mobile: from, deletedAt: null });
  const organisation = contact?.organisationId
    ? await OrganisationModel.findOne({ _id: contact.organisationId, tenantId, deletedAt: null })
    : null;

  // A known contact's tickets are found by contact; an unknown sender's by number.
  const mine: Record<string, unknown> = {
    tenantId,
    channel: 'whatsapp',
    deletedAt: null,
    mergedIntoId: null,
    ...(contact ? { contactId: contact._id } : { requesterPhone: from }),
  };

  const open = await TicketModel.findOne({ ...mine, status: { $ne: 'closed' } }).sort({
    lastActivityAt: -1,
  });

  let ticketId: Types.ObjectId;
  let ticketMessageId: string;

  if (open) {
    const created = await TicketMessageModel.create({
      tenantId,
      ticketId: open._id,
      visibility: 'public',
      direction: 'inbound',
      body,
      authorUserId: null,
      authorContactId: contact?._id ?? null,
      authorName: contact?.name ?? senderName,
      channel: 'whatsapp',
      externalMessageId: `wa:${message.providerMessageId}`,
      sentAt: message.sentAt ?? new Date(),
    });
    ticketId = open._id;
    ticketMessageId = String(created._id);

    // The customer has written, so the ball is back with us.
    const reopen = ['pending_customer', 'resolved'].includes(open.status);
    await TicketModel.updateOne(
      { _id: open._id, tenantId },
      {
        $set: {
          lastActivityAt: new Date(),
          customerActivityAt: new Date(),
          ...(reopen ? { status: 'open', resolvedAt: null } : {}),
        },
      },
    );
    await alertStaff(
      'customer_replied',
      open.assigneeId,
      `[${open.number}] Customer replied on WhatsApp: ${open.subject}`,
      [
        `${contact?.name ?? senderName} wrote on WhatsApp on ticket ${open.number}.`,
        '',
        body.length > 1_000 ? `${body.slice(0, 1_000)}…` : body,
        '',
        `${appBaseUrl()}/support/tickets/${open._id}`,
      ],
    );
  } else {
    const previous = await TicketModel.findOne({ ...mine, status: 'closed' })
      .sort({ closedAt: -1 })
      .select('_id number');

    const created = await createTicket({
      subject: ticketSubject(contact?.name ?? senderName, body),
      body,
      queueId: String(queueId),
      organisationId: organisation ? String(organisation._id) : null,
      contactId: contact ? String(contact._id) : null,
      channel: 'whatsapp',
      authorName: contact?.name ?? senderName,
      onBehalfOfCustomer: true,
    });
    ticketId = toObjectId(created.id);
    ticketMessageId = created.firstMessageId;

    await TicketMessageModel.updateOne(
      { _id: toObjectId(created.firstMessageId), tenantId },
      {
        $set: {
          externalMessageId: `wa:${message.providerMessageId}`,
          sentAt: message.sentAt ?? new Date(),
        },
      },
    );
    await TicketModel.updateOne(
      { _id: ticketId, tenantId },
      {
        $set: {
          requesterPhone: from,
          requesterName: senderName,
          customerActivityAt: new Date(),
          ...(previous ? { followsOnFromId: previous._id } : {}),
        },
      },
    );

    // "Ticket received" is always sent (John, 1 Oct 2026). The customer has just written, so the
    // 24 hour window is open and plain text is allowed.
    const ticket = await TicketModel.findOne({ _id: ticketId, tenantId }).select('number');
    const tenant = await TenantModel.findById(tenantId).select('name').lean();
    if (ticket) {
      await queueChannelMessage({
        account: 'support',
        to: from,
        kind: 'text',
        text: acknowledgementText(tenant?.name ?? 'us', ticket.number),
        ticketId: String(ticketId),
        contactId: contact ? String(contact._id) : null,
      });
      await TicketMessageModel.create({
        tenantId,
        ticketId,
        visibility: 'internal',
        direction: 'outbound',
        body: `Automatic WhatsApp acknowledgement sent to ${from}.${
          previous ? ` This follows closed ticket ${previous.number}.` : ''
        }${contact ? '' : ' Sender is not a CRM contact yet: link a contact to this ticket.'}`,
        authorUserId: null,
        authorName: 'COEX',
        channel: 'system',
      });
    }
  }

  if (message.media?.url) {
    try {
      const apiKey =
        settings?.provider === 'xverse' ? openSecret(settings.xverse?.apiKeySealed) : null;
      const file = await downloadMedia(message.media.url, apiKey);
      await attachToMessage(ticketMessageId, [
        {
          fileName: message.media.fileName || `whatsapp-${message.type}`,
          contentType: message.media.mimeType || file.contentType || 'application/octet-stream',
          body: file.body,
        },
      ]);
    } catch (error) {
      // The words are already on the ticket; a missing file is noted, never a lost message.
      await TicketMessageModel.create({
        tenantId,
        ticketId,
        visibility: 'internal',
        direction: 'inbound',
        body: `A WhatsApp ${message.type} could not be attached: ${
          error instanceof Error ? error.message : String(error)
        } Link: ${message.media.url}`,
        authorUserId: null,
        authorName: 'COEX',
        channel: 'system',
      });
    }
  }

  await ChannelMessageModel.updateOne(
    { _id: message._id },
    {
      $set: {
        processedAt: new Date(),
        leaseUntil: null,
        error: null,
        ticketId,
        contactId: contact?._id ?? null,
      },
    },
  );
}

/**
 * Turns the tenant's waiting Support messages into tickets, oldest first so a conversation
 * threads in order. Runs in the tenant's context. CRM messages wait for M6.5.
 */
export async function processPendingSupportInbound(limit = 50): Promise<{
  processed: number;
  failed: number;
}> {
  const { tenantId } = getContext();
  await connectToDatabase();
  const waiting = await ChannelMessageModel.find({
    tenantId,
    direction: 'in',
    account: 'support',
    processedAt: null,
    attempts: { $lt: MAX_PROCESS_ATTEMPTS },
  })
    .sort({ sentAt: 1, createdAt: 1 })
    .limit(limit)
    .select('_id')
    .lean();

  const result = { processed: 0, failed: 0 };
  for (const row of waiting) {
    const message = await claim(row._id);
    if (!message) continue;
    try {
      await handleSupportMessage(message);
      result.processed += 1;
    } catch (error) {
      const attempts = (message.attempts ?? 0) + 1;
      await ChannelMessageModel.updateOne(
        { _id: message._id },
        {
          $set: {
            attempts,
            leaseUntil: null,
            error: error instanceof Error ? error.message : String(error),
            // Given up on: kept, visible in Setup, WhatsApp, and never retried again.
            ...(attempts >= MAX_PROCESS_ATTEMPTS ? { processedAt: new Date() } : {}),
          },
        },
      );
      result.failed += 1;
    }
  }
  return result;
}

/** For the channel worker: every tenant with WhatsApp on, in that tenant's own context. */
export async function processAllPendingSupportInbound(): Promise<{
  processed: number;
  failed: number;
}> {
  await connectToDatabase();
  const totals = { processed: 0, failed: 0 };
  const tenants = await ChannelSettingsModel.find({ enabled: true }).lean();
  for (const settings of tenants) {
    const actor = settings.actorUserId ?? settings.updatedById;
    if (!actor) continue;
    const result = await runWithContext(
      { tenantId: settings.tenantId, userId: actor, isPlatformAdmin: false },
      () => processPendingSupportInbound(),
    );
    totals.processed += result.processed;
    totals.failed += result.failed;
  }
  return totals;
}

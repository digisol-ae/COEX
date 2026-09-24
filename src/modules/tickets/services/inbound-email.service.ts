import type { ParsedMail } from 'mailparser';
import { connectToDatabase } from '@/lib/db';
import { runWithContext } from '@/lib/tenant-context';
import { toObjectId } from '@/lib/ids';
import { ContactModel } from '@/modules/crm/models/contact.model';
import { OrganisationModel } from '@/modules/crm/models/organisation.model';
import { TicketMessageModel } from '../models/ticket-message.model';
import { TicketModel } from '../models/ticket.model';
import { attachToMessage } from './attachment.service';
import { createTicket } from './ticket.service';

export interface InboundEmailConfig { tenantId: string; actorUserId: string; queueId: string; }

/**
 * Stores one parsed email safely. The mailbox worker owns fetching/marking it seen; this service
 * owns tenant isolation, CRM matching, duplicate prevention, threading and attachments.
 */
export async function importInboundEmail(config: InboundEmailConfig, mail: ParsedMail): Promise<'created' | 'threaded' | 'duplicate'> {
  const messageId = mail.messageId?.trim();
  if (!messageId) throw new Error('Inbound email has no Message-ID; refusing to import an unthreadable message.');
  const tenantId = toObjectId(config.tenantId);

  await connectToDatabase();

  return runWithContext({ tenantId, userId: toObjectId(config.actorUserId), isPlatformAdmin: true }, async () => {
    if (await TicketMessageModel.findOne({ tenantId, externalMessageId: messageId })) return 'duplicate';
    const from = mail.from?.value[0];
    const email = from?.address?.trim().toLowerCase();
    const contact = email ? await ContactModel.findOne({ tenantId, email, deletedAt: null }) : null;
    const organisation = contact?.organisationId
      ? await OrganisationModel.findOne({ _id: contact.organisationId, tenantId, deletedAt: null })
      : email ? await OrganisationModel.findOne({ tenantId, email, deletedAt: null }) : null;
    const html = typeof mail.html === 'string' ? mail.html.replace(/<[^>]*>/g, ' ') : '';
    const body = (mail.text ?? html).trim() || '(No readable email body.)';
    const references = [mail.inReplyTo, ...(mail.references ?? [])].filter(Boolean) as string[];
    const parent = references.length
      ? await TicketMessageModel.findOne({ tenantId, externalMessageId: { $in: references } })
      : null;
    let messageIdForAttachments: string;
    let result: 'created' | 'threaded';
    if (parent) {
      const message = await TicketMessageModel.create({ tenantId, ticketId: parent.ticketId, visibility: 'public', direction: 'inbound', body, authorUserId: null, authorContactId: contact?._id ?? null, authorName: from?.name?.trim() || email || 'Unknown sender', channel: 'email', externalMessageId: messageId, sentAt: mail.date ?? new Date() });
      messageIdForAttachments = String(message._id); result = 'threaded';
      await TicketModel.updateOne({ _id: parent.ticketId, tenantId }, { $set: { lastActivityAt: new Date() } });
    } else {
      const created = await createTicket({ subject: mail.subject?.trim() || '(No subject)', body, queueId: config.queueId, organisationId: organisation ? String(organisation._id) : null, contactId: contact ? String(contact._id) : null, channel: 'email', authorName: from?.name?.trim() || email || 'Unknown sender', onBehalfOfCustomer: true });
      messageIdForAttachments = created.firstMessageId; result = 'created';
      await TicketMessageModel.updateOne({ _id: toObjectId(created.firstMessageId), tenantId }, { $set: { externalMessageId: messageId, sentAt: mail.date ?? new Date() } });
    }
    await attachToMessage(messageIdForAttachments, mail.attachments.map((file) => ({ fileName: file.filename ?? 'attachment', contentType: file.contentType || 'application/octet-stream', body: file.content })));
    return result;
  });
}

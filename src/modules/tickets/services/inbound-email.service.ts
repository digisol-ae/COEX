import type { ParsedMail } from 'mailparser';
import { connectToDatabase } from '@/lib/db';
import { runWithContext } from '@/lib/tenant-context';
import { toObjectId } from '@/lib/ids';
import { ContactModel } from '@/modules/crm/models/contact.model';
import { OrganisationModel } from '@/modules/crm/models/organisation.model';
import { TenantModel } from '@/modules/core/models/tenant.model';
import {
  alertStaff,
  appBaseUrl,
  autoReplySentRecently,
  newMessageId,
  ownEmailAddresses,
  queueEmail,
} from '@/modules/core/services/email.service';
import { EmailSettingsModel } from '@/modules/core/models/email-settings.model';
import { TicketMessageModel } from '../models/ticket-message.model';
import { TicketModel } from '../models/ticket.model';
import { attachToMessage } from './attachment.service';
import { createTicket } from './ticket.service';

export interface InboundEmailConfig {
  tenantId: string;
  actorUserId: string;
  queueId: string;
}

export type InboundResult = 'created' | 'threaded' | 'duplicate' | 'ignored';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Mail written by a machine: out of office replies, bounces, mailing lists. It may still become or
 * join a ticket, but it is never answered automatically, because two auto responders answering each
 * other is how a mailbox fills with thousands of messages overnight.
 */
function isAutomatic(mail: ParsedMail, sender: string): boolean {
  const header = (name: string) => {
    const value = mail.headers.get(name);
    return typeof value === 'string'
      ? value.toLowerCase()
      : value
        ? String(value).toLowerCase()
        : '';
  };
  const autoSubmitted = header('auto-submitted');
  if (autoSubmitted && autoSubmitted !== 'no') return true;
  if (['bulk', 'junk', 'list'].includes(header('precedence'))) return true;
  if (
    mail.headers.has('list-id') ||
    mail.headers.has('x-autoreply') ||
    mail.headers.has('x-autorespond')
  ) {
    return true;
  }
  return /^(mailer-daemon|postmaster|no-?reply|do-?not-?reply)@/i.test(sender);
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
}

/**
 * Stores one parsed email safely. The mailbox worker owns fetching; this service owns tenant
 * isolation, CRM matching, duplicate prevention, threading, attachments, the customer's automatic
 * acknowledgement and the assignee's alert.
 */
export async function importInboundEmail(
  config: InboundEmailConfig,
  mail: ParsedMail,
): Promise<InboundResult> {
  const messageId = mail.messageId?.trim();
  if (!messageId) {
    throw new Error('Inbound email has no Message-ID; refusing to import an unthreadable message.');
  }
  const tenantId = toObjectId(config.tenantId);

  await connectToDatabase();

  return runWithContext(
    { tenantId, userId: toObjectId(config.actorUserId), isPlatformAdmin: false },
    async () => {
      if (await TicketMessageModel.findOne({ tenantId, externalMessageId: messageId })) {
        return 'duplicate';
      }

      const from = mail.from?.value[0];
      const email = from?.address?.trim().toLowerCase() ?? '';
      const senderName = from?.name?.trim() || email || 'Unknown sender';

      // Our own mail coming back (a copy, a bounce of a bounce) is never a customer request.
      if (email && (await ownEmailAddresses(tenantId)).includes(email)) return 'ignored';

      const contact = email
        ? await ContactModel.findOne({ tenantId, email, deletedAt: null })
        : null;
      const organisation = contact?.organisationId
        ? await OrganisationModel.findOne({
            _id: contact.organisationId,
            tenantId,
            deletedAt: null,
          })
        : email
          ? await OrganisationModel.findOne({ tenantId, email, deletedAt: null })
          : null;

      const html = typeof mail.html === 'string' ? mail.html.replace(/<[^>]*>/g, ' ') : '';
      const body = (mail.text ?? html).trim() || '(No readable email body.)';
      const subject = mail.subject?.trim() || '(No subject)';

      // Thread by the email headers first, then by the ticket number we put in every subject line,
      // which survives mail clients that drop the headers.
      const references = [mail.inReplyTo, ...(mail.references ?? [])].filter(Boolean) as string[];
      const byHeader = references.length
        ? await TicketMessageModel.findOne({ tenantId, externalMessageId: { $in: references } })
        : null;
      let parentTicket = byHeader
        ? await TicketModel.findOne({ _id: byHeader.ticketId, tenantId })
        : null;

      if (!parentTicket) {
        const tenant = await TenantModel.findOne({ _id: tenantId }).select('numbering');
        const prefix = tenant?.numbering?.ticketPrefix ?? 'S';
        const token = subject.match(new RegExp(`\\[(${escapeRegExp(prefix)}-\\d+)\\]`, 'i'));
        if (token) {
          parentTicket = await TicketModel.findOne({
            tenantId,
            number: token[1].toUpperCase(),
            deletedAt: null,
          });
        }
      }

      // A reply to a closed ticket starts a fresh one: nothing leaves Closed.
      if (parentTicket?.status === 'closed') parentTicket = null;

      let messageIdForAttachments: string;
      let result: 'created' | 'threaded';

      if (parentTicket) {
        const message = await TicketMessageModel.create({
          tenantId,
          ticketId: parentTicket._id,
          visibility: 'public',
          direction: 'inbound',
          body,
          authorUserId: null,
          authorContactId: contact?._id ?? null,
          authorName: senderName,
          channel: 'email',
          externalMessageId: messageId,
          sentAt: mail.date ?? new Date(),
        });
        messageIdForAttachments = String(message._id);
        result = 'threaded';

        // The customer has answered, so the ball is back with us.
        const reopen = ['pending_customer', 'resolved'].includes(parentTicket.status);
        await TicketModel.updateOne(
          { _id: parentTicket._id, tenantId },
          { $set: { lastActivityAt: new Date(), ...(reopen ? { status: 'open' } : {}) } },
        );

        await alertStaff(
          'customer_replied',
          parentTicket.assigneeId,
          `[${parentTicket.number}] Customer replied: ${parentTicket.subject}`,
          [
            `${senderName} replied on ticket ${parentTicket.number}.`,
            '',
            body.length > 1_000 ? `${body.slice(0, 1_000)}…` : body,
            '',
            `${appBaseUrl()}/support/tickets/${parentTicket._id}`,
          ],
        );
      } else {
        const created = await createTicket({
          subject,
          body,
          queueId: config.queueId,
          organisationId: organisation ? String(organisation._id) : null,
          contactId: contact ? String(contact._id) : null,
          channel: 'email',
          authorName: senderName,
          onBehalfOfCustomer: true,
        });
        messageIdForAttachments = created.firstMessageId;
        result = 'created';

        await TicketMessageModel.updateOne(
          { _id: toObjectId(created.firstMessageId), tenantId },
          { $set: { externalMessageId: messageId, sentAt: mail.date ?? new Date() } },
        );
        // The sender's address is kept even when they are not a CRM contact yet, so replies
        // can still reach them.
        await TicketModel.updateOne(
          { _id: toObjectId(created.id), tenantId },
          { $set: { requesterEmail: email || null, requesterName: senderName } },
        );

        await acknowledge({
          ticketId: created.id,
          to: email,
          customer: from?.name?.trim() || contact?.name || 'Customer',
          subject,
          inReplyTo: messageId,
          automatic: isAutomatic(mail, email),
        });
      }

      await attachToMessage(
        messageIdForAttachments,
        mail.attachments.map((file) => ({
          fileName: file.filename ?? 'attachment',
          contentType: file.contentType || 'application/octet-stream',
          body: file.content,
        })),
      );

      return result;
    },
  );
}

/** The automatic acknowledgement to a customer who has just opened a ticket by email. */
async function acknowledge(input: {
  ticketId: string;
  to: string;
  customer: string;
  subject: string;
  inReplyTo: string;
  automatic: boolean;
}): Promise<void> {
  if (!input.to || input.automatic) return;
  if (await autoReplySentRecently(input.to)) return;

  const ticket = await TicketModel.findOne({ _id: toObjectId(input.ticketId) });
  if (!ticket) return;

  const settings = await EmailSettingsModel.findOne({ tenantId: ticket.tenantId });
  const customer = settings?.customer;
  if (!customer?.autoReplyEnabled) return;

  const values = { customer: input.customer, ticket: ticket.number, subject: input.subject };
  const messageId = await newMessageId();

  const queued = await queueEmail({
    kind: 'auto_reply',
    to: input.to,
    subject: `[${ticket.number}] ${fill(customer.autoReplySubject ?? '', values)}`,
    text: fill(customer.autoReplyBody ?? '', values),
    messageId,
    inReplyTo: input.inReplyTo,
    references: [input.inReplyTo],
  });

  if (queued) {
    await TicketMessageModel.create({
      tenantId: ticket.tenantId,
      ticketId: ticket._id,
      visibility: 'internal',
      direction: 'outbound',
      body: `Automatic acknowledgement emailed to ${input.to}.`,
      authorUserId: null,
      authorName: 'COEX',
      channel: 'system',
      externalMessageId: messageId,
    });
  }
}

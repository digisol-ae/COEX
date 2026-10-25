import { ticketSearchClauses } from '@/modules/tickets/services/search-filter.service';
import { permissionsFor } from '@coex/shared/core/permissions';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { Types, type QueryFilter } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { UserModel } from '@coex/shared/core/models/user.model';
import { ContactModel } from '@coex/shared/crm/models/contact.model';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import { QueueModel } from '@coex/shared/tickets/models/queue.model';
import { TicketModel, type Ticket } from '@coex/shared/tickets/models/ticket.model';
import { TicketMessageModel } from '@coex/shared/tickets/models/ticket-message.model';
import { createTicket } from '@/modules/tickets/services/ticket.service';
import {
  attachToMessage,
  attachmentForDownload,
  MAX_FILE_BYTES,
  MAX_MESSAGE_ATTACHMENT_BYTES,
  type IncomingFile,
} from '@/modules/tickets/services/attachment.service';
import { recordAudit } from '@/modules/core/services/audit.service';
import { createUser } from '@/modules/core/services/user.service';
import { alertStaff, appBaseUrl } from '@/modules/core/services/email.service';

/** Revalidate account/contact/company on every call. Never infer access from an email alone. */
export async function portalIdentity() {
  await connectToDatabase();
  const { tenantId, userId } = getContext();
  const user = await UserModel.findOne({
    _id: userId,
    tenantId,
    role: 'client_contact',
    status: 'active',
    deletedAt: null,
  });
  if (
    !user ||
    !permissionsFor({
      role: 'client_contact',
      permissionGrants: user.permissionGrants,
      permissionDenials: user.permissionDenials,
    }).has('ticket.read.own')
  )
    throw new Error(
      'Portal access is not linked to an active customer contact. Please contact support.',
    );
  if (
    !(await TenantModel.exists({
      _id: tenantId,
      status: 'active',
      'modules.tickets': { $ne: false },
    }))
  )
    throw new Error('Customer support is not available for this workspace.');
  const contacts = await ContactModel.find({
    tenantId,
    userId,
    organisationId: user.organisationId,
    status: 'active',
    deletedAt: null,
  }).limit(2);
  const contact = contacts.length === 1 ? contacts[0] : null;
  if (!contact || contact.email?.toLowerCase() !== user.email.toLowerCase())
    throw new Error(
      'Portal access is not linked to an active customer contact. Please contact support.',
    );
  if (!user.organisationId) {
    if (!user.legacySourceId?.startsWith('osticket:') || contact.organisationId)
      throw new Error('Customer assignment is pending. Please contact support.');
    return { user, contact, organisation: { _id: null, name: 'Customer assignment pending' } };
  }
  const organisation = await OrganisationModel.findOne({
    _id: user.organisationId,
    tenantId,
    status: 'active',
    deletedAt: null,
  });
  if (!organisation) throw new Error('This customer account is inactive. Please contact support.');
  return { user, contact, organisation };
}
async function ownScope() {
  const identity = await portalIdentity();
  return {
    identity,
    filter: {
      tenantId: getContext().tenantId,
      deletedAt: null,
      organisationId: identity.organisation._id,
      $or: [
        { contactId: identity.contact._id },
        { contactId: null, requesterEmail: identity.user.email },
      ],
    },
  };
}
export async function portalTickets(search = '', page = 1, status = '') {
  const { filter } = await ownScope();
  const safePage = Math.max(1, Number.isSafeInteger(page) ? page : 1);
  const query: QueryFilter<Ticket> = {
    ...filter,
    ...(search.trim() ? { $and: await ticketSearchClauses(search, true) } : {}),
    ...(status === 'closed'
      ? { status: { $in: ['resolved', 'closed'] } }
      : status === 'open'
        ? { status: { $nin: ['resolved', 'closed'] } }
        : {}),
  };
  const [tickets, total] = await Promise.all([
    TicketModel.find(query)
      .select('number subject status createdAt lastActivityAt')
      .sort({ lastActivityAt: -1, _id: -1 })
      .skip((safePage - 1) * 25)
      .limit(25),
    TicketModel.countDocuments(query),
  ]);
  return {
    tickets: tickets.map((t) => ({
      id: String(t._id),
      number: t.number,
      subject: t.subject,
      status: t.status,
      createdAt: t.createdAt,
    })),
    total,
    page: safePage,
  };
}
export async function portalTicket(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  const { filter } = await ownScope();
  const ticket = await TicketModel.findOne({ ...filter, _id: id }).select(
    'number subject status createdAt mergedIntoId',
  );
  if (!ticket) return null;
  const messages = await TicketMessageModel.find({
    tenantId: getContext().tenantId,
    ticketId: ticket._id,
    visibility: 'public',
    channel: { $ne: 'system' },
  }).sort({ sentAt: 1, _id: 1 });
  return {
    id: String(ticket._id),
    number: ticket.number,
    subject: ticket.subject,
    status: ticket.status,
    createdAt: ticket.createdAt,
    canReply: ticket.status !== 'closed' && !ticket.mergedIntoId,
    messages: messages.map((m) => ({
      id: String(m._id),
      body: m.body,
      authorName: m.authorName,
      sentAt: m.sentAt ?? m.createdAt,
      direction: m.direction,
      attachments: m.attachments.map((a) => ({
        id: String(a._id),
        fileName: a.fileName,
        bytes: a.bytes,
        contentType: a.contentType,
      })),
    })),
  };
}
function validateText(subject: string, body: string) {
  if (!subject.trim() || subject.length > 200)
    throw new Error('Enter a subject of up to 200 characters.');
  if (!body.trim() || body.length > 20000)
    throw new Error('Enter a message of up to 20,000 characters.');
}
function validateFiles(files: IncomingFile[]) {
  if (
    files.length > 10 ||
    files.some((f) => f.body.length > MAX_FILE_BYTES) ||
    files.reduce((sum, f) => sum + f.body.length, 0) > MAX_MESSAGE_ATTACHMENT_BYTES
  )
    throw new Error('Use up to 10 attachments, 3 MB per file and 10 MB total.');
}
async function addFiles(messageId: string, files: IncomingFile[]) {
  try {
    if (files.length) await attachToMessage(messageId, files);
    return false;
  } catch {
    return true;
  } // The message is already saved; report that fact so a retry cannot duplicate it.
}
export async function raisePortalTicket(input: {
  subject: string;
  body: string;
  files?: IncomingFile[];
}) {
  const { identity } = await ownScope();
  if (!identity.organisation._id)
    throw new Error(
      'Please contact support to link your customer account before raising a new ticket.',
    );
  validateText(input.subject, input.body);
  validateFiles(input.files ?? []);
  const queue = await QueueModel.findOne({
    tenantId: getContext().tenantId,
    status: 'active',
    deletedAt: null,
    isDefault: true,
  });
  if (!queue) throw new Error('Support is not configured yet. Please contact your support team.');
  const created = await createTicket({
    subject: input.subject,
    body: input.body,
    queueId: String(queue._id),
    organisationId: String(identity.organisation._id),
    contactId: String(identity.contact._id),
    channel: 'portal',
    onBehalfOfCustomer: true,
    authorName: identity.contact.name,
  });
  return {
    id: created.id,
    attachmentFailed: await addFiles(created.firstMessageId, input.files ?? []),
  };
}
export async function replyFromPortal(id: string, body: string, files: IncomingFile[] = []) {
  validateText('Reply', body);
  validateFiles(files);
  const { identity, filter } = await ownScope();
  if (!Types.ObjectId.isValid(id)) throw new Error('Ticket not found.');
  const ticket = await TicketModel.findOne({ ...filter, _id: id });
  if (!ticket) throw new Error('Ticket not found.');
  if (ticket.status === 'closed' || ticket.mergedIntoId)
    throw new Error('This ticket no longer accepts replies. Please raise a new ticket.');
  const now = new Date();
  const message = await TicketMessageModel.create({
    tenantId: getContext().tenantId,
    ticketId: ticket._id,
    visibility: 'public',
    direction: 'inbound',
    body: body.trim(),
    authorUserId: identity.user._id,
    authorContactId: identity.contact._id,
    authorName: identity.contact.name,
    channel: 'portal',
    sentAt: now,
  });
  await TicketModel.updateOne(
    { ...filter, _id: ticket._id },
    {
      $set: {
        lastActivityAt: now,
        customerActivityAt: now,
        ...(['pending_customer', 'resolved'].includes(ticket.status) ? { status: 'open' } : {}),
      },
    },
  );
  await recordAudit({ action: 'ticket.portal_reply', entityType: 'Ticket', entityId: ticket._id });
  try {
    await alertStaff(
      'customer_replied',
      ticket.assigneeId,
      `[${ticket.number}] Customer replied: ${ticket.subject}`,
      [
        `${identity.contact.name} replied through the customer portal.`,
        body.slice(0, 1000),
        `${appBaseUrl()}/support/tickets/${ticket._id}`,
      ],
    );
  } catch {
    /* Keep the saved reply if notification delivery fails. */
  }
  return { attachmentFailed: await addFiles(String(message._id), files) };
}
export async function portalAttachment(id: string, attachmentId: string) {
  if (!Types.ObjectId.isValid(attachmentId)) return null;
  const ticket = await portalTicket(id);
  if (!ticket || !ticket.messages.some((m) => m.attachments.some((a) => a.id === attachmentId)))
    return null;
  return attachmentForDownload(id, attachmentId);
}
/** Administrative provisioning only; existing staff accounts are never repurposed. */
export async function provisionPortalAccount(contactId: string) {
  await connectToDatabase();
  const { tenantId, userId } = getContext();
  const admin = await UserModel.findOne({
    _id: userId,
    tenantId,
    status: 'active',
    deletedAt: null,
  });
  if (
    !admin ||
    admin.role === 'client_contact' ||
    !permissionsFor({
      ...admin.toObject(),
      role: admin.role as Parameters<typeof permissionsFor>[0]['role'],
    }).has('user.manage')
  )
    throw new Error('Not allowed.');
  if (!Types.ObjectId.isValid(contactId)) throw new Error('Contact not found.');
  const contact = await ContactModel.findOne({
    _id: contactId,
    tenantId,
    status: 'active',
    deletedAt: null,
  });
  if (!contact?.email || contact.userId)
    throw new Error('Use an active contact with an email address and no existing portal account.');
  if (
    !(await OrganisationModel.exists({
      _id: contact.organisationId,
      tenantId,
      status: 'active',
      deletedAt: null,
    }))
  )
    throw new Error('Customer is inactive.');
  // Password sign-in resolves a global email; do not create an ambiguous second identity.
  if (await UserModel.exists({ email: contact.email, deletedAt: null }))
    throw new Error(
      'This email already has a Worktello account. Ask an administrator to review its access.',
    );
  const result = await createUser({
    name: contact.name,
    email: contact.email,
    role: 'client_contact',
  });
  const user = await UserModel.findOne({
    tenantId,
    email: contact.email,
    role: 'client_contact',
    deletedAt: null,
  });
  if (!user) throw new Error('Could not link account.');
  await UserModel.updateOne(
    { _id: user._id, tenantId },
    { $set: { organisationId: contact.organisationId } },
  );
  const linked = await ContactModel.updateOne(
    {
      _id: contact._id,
      tenantId,
      userId: null,
      email: contact.email,
      organisationId: contact.organisationId,
      status: 'active',
      deletedAt: null,
    },
    { $set: { userId: user._id } },
  );
  if (!linked.modifiedCount) {
    await UserModel.updateOne({ _id: user._id, tenantId }, { $set: { status: 'suspended' } });
    throw new Error(
      'Contact changed while linking. The new account is suspended; ask an administrator to review it.',
    );
  }
  await recordAudit({
    action: 'contact.portal_access_created',
    entityType: 'Contact',
    entityId: contact._id,
    after: { userId: String(user._id) },
  });
  return result;
}

/** Public support replies on this contact's own tickets only. */
export async function portalNotifications(since: Date, until: Date) {
  const { filter } = await ownScope();
  const tickets = await TicketModel.find(filter).select('_id number');
  const numbers = new Map(tickets.map((ticket) => [String(ticket._id), ticket.number]));
  const messages = await TicketMessageModel.find({
    tenantId: getContext().tenantId,
    ticketId: { $in: tickets.map((ticket) => ticket._id) },
    visibility: 'public',
    direction: 'outbound',
    channel: { $ne: 'system' },
    sentAt: { $gt: since, $lte: until },
  })
    .sort({ sentAt: -1 })
    .limit(20);
  return messages.reverse().map((message) => ({
    id: `portal:${message._id}`,
    title: `${numbers.get(String(message.ticketId))} · Support replied`,
    body: 'Open your ticket to read the reply.',
    url: `/portal/tickets/${message.ticketId}`,
  }));
}

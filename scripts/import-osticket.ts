/** Historical import. No service hooks, notifications, password changes or attachment payloads. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import mongoose, { type Model } from 'mongoose';
import { UserModel } from '@coex/shared/core/models/user.model';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { ContactModel } from '@coex/shared/crm/models/contact.model';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import { QueueModel } from '@coex/shared/tickets/models/queue.model';
import { TicketModel } from '@coex/shared/tickets/models/ticket.model';
import { TicketMessageModel } from '@coex/shared/tickets/models/ticket-message.model';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic SQL columns are checked by destination model validation before writes.
type Row = Record<string, any>; // SQL staging fields are validated by the destination schemas below.
async function main() {
  const source = process.env.OSTICKET_SOURCE_DIR;
  const uri = process.env.MONGODB_URI;
  const apply = process.argv.includes('--apply');
  const production = process.argv.includes('--production');
  if (!source || !uri) throw new Error('Set OSTICKET_SOURCE_DIR and MONGODB_URI.');
  if (apply && !production && !new URL(uri).pathname.startsWith('/coex_test_ost_'))
    throw new Error('Writes require a disposable trial database or explicit --production.');
  if (production && process.env.OSTICKET_APPROVED_TENANT !== '6aae5ff8af8b7c63d6ce36d0')
    throw new Error('Production tenant approval is required.');
  const read = (name: string): Row[] =>
    fs
      .readFileSync(path.join(source, name + '.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  const sourceUsers = read('ost_user'),
    sourceEmails = read('ost_user_email');
  const sourceTickets = read('ost_ticket'),
    sourceThreads = read('ost_thread');
  const sourceMessages = read('messages-readable');
  if (
    sourceUsers.length !== 428 ||
    sourceTickets.length !== 4983 ||
    sourceMessages.length !== 19996
  )
    throw new Error('Unexpected source counts; re-review the source manifest.');
  await mongoose.connect(uri);
  const tenant = await TenantModel.findOne({ slug: 'digisol', status: 'active', deletedAt: null });
  if (!tenant || (production && String(tenant._id) !== process.env.OSTICKET_APPROVED_TENANT))
    throw new Error('Tenant mismatch.');
  const tenantId = tenant._id;
  const id = (kind: string, sourceId: unknown) =>
    new mongoose.Types.ObjectId(
      crypto
        .createHash('sha256')
        .update(`osticket:${tenantId}:${kind}:${sourceId}`)
        .digest('hex')
        .slice(0, 24),
    );
  const date = (raw: unknown, fallback?: unknown): Date | null => {
    const text = String(raw ?? '');
    const value = text && !text.startsWith('0000-') ? new Date(text.replace(' ', 'T') + 'Z') : null;
    if (value && !Number.isNaN(value.getTime())) return value;
    return fallback ? date(fallback) : null;
  };
  const [existingUsers, existingContacts, customers, existingTickets] = await Promise.all([
    UserModel.find({ deletedAt: null }).lean(),
    ContactModel.find({ tenantId, deletedAt: null }).lean(),
    OrganisationModel.find({ tenantId, deletedAt: null, status: 'active' }).lean(),
    TicketModel.find({ tenantId }).select('_id number customFields').lean(),
  ]);
  const emails = new Map(
    sourceEmails.map((e) => [e.user_id, String(e.address).trim().toLowerCase()]),
  );
  const userData = new Map(read('ost_user__cdata').map((e) => [e.user_id, e]));
  const preparedUsers: Row[] = [],
    preparedContacts: Row[] = [],
    preparedQueues: Row[] = [],
    preparedTickets: Row[] = [],
    preparedMessages: Row[] = [];
  const userIds = new Map<number, mongoose.Types.ObjectId>(),
    contactIds = new Map<number, mongoose.Types.ObjectId>(),
    orgIds = new Map<number, mongoose.Types.ObjectId | null>();
  const decisions: Row[] = [];
  for (const u of sourceUsers) {
    const email = emails.get(u.id);
    if (!email || !/^\S+@\S+\.\S+$/.test(email))
      throw new Error('Source user email requires correction: ' + u.id);
    const matches = existingUsers.filter((x) => x.email.toLowerCase() === email);
    if (matches.length > 1 || matches.some((x) => String(x.tenantId) !== String(tenantId)))
      throw new Error('Ambiguous existing identity: source ' + u.id);
    const existing = matches[0];
    const staff = existing && existing.role !== 'client_contact';
    const ec = existingContacts.filter((x) => x.email?.toLowerCase() === email);
    const candidates = [
      ...new Set([
        ...ec.map((x) => String(x.organisationId)).filter((x) => x !== 'null'),
        ...customers.filter((x) => x.email?.toLowerCase() === email).map((x) => String(x._id)),
      ]),
    ];
    // Existing identity links are authoritative; domain/name similarity never grants access.
    const linkedOrg = existing?.organisationId ? String(existing.organisationId) : null;
    const proposed = !staff && candidates.length === 1 ? candidates[0] : null;
    const chosen = linkedOrg ?? proposed;
    const org =
      chosen && customers.some((c) => String(c._id) === chosen)
        ? new mongoose.Types.ObjectId(chosen)
        : null;
    if (ec.length > 1) throw new Error('Multiple CRM contacts require review: source ' + u.id);
    const uid = existing ? existing._id : id('user', u.id);
    const cid = ec.length === 1 ? ec[0]._id : id('contact', u.id);
    if (ec[0]?.userId && String(ec[0].userId) !== String(uid))
      throw new Error('Contact already linked to another identity: ' + u.id);
    userIds.set(u.id, uid);
    contactIds.set(u.id, cid);
    orgIds.set(u.id, staff ? (ec[0]?.organisationId ?? null) : org);
    if (!existing)
      preparedUsers.push({
        _id: uid,
        tenantId,
        email,
        name: u.name,
        role: 'client_contact',
        status: 'invited',
        passwordHash: null,
        mustChangePassword: true,
        legacySourceId: 'osticket:' + u.id,
        organisationId: org,
        createdAt: date(u.created),
        updatedAt: date(u.updated, u.created),
      });
    if (!ec.length)
      preparedContacts.push({
        _id: cid,
        tenantId,
        organisationId: staff ? null : org,
        name: u.name,
        email,
        phone: userData.get(u.id)?.phone ?? null,
        notes: userData.get(u.id)?.notes ?? null,
        userId: staff ? null : uid,
        status: 'active',
        customFields: { osticketUserId: u.id, customerAssignment: org ? 'exact_email' : 'pending' },
        createdAt: date(u.created),
        updatedAt: date(u.updated, u.created),
      });
    decisions.push({
      sourceUserId: u.id,
      destinationUserId: String(uid),
      destinationContactId: String(cid),
      customerId: orgIds.get(u.id) ? String(orgIds.get(u.id)) : null,
      existingAccount: !!existing,
      staffAccountPreserved: !!staff,
      match: org ? 'unique exact email or existing link' : 'unassigned',
    });
  }
  for (const d of read('ost_department'))
    preparedQueues.push({
      _id: id('queue', d.id),
      tenantId,
      name: 'Legacy · ' + d.name,
      description: 'Imported osTicket history',
      status: 'active',
      isDefault: false,
      memberIds: [],
      autoSign: false,
    });
  const staffMap = new Map<number, mongoose.Types.ObjectId>();
  for (const s of read('ost_staff')) {
    const match = existingUsers.filter(
      (u) =>
        String(u.tenantId) === String(tenantId) &&
        u.role !== 'client_contact' &&
        u.email.toLowerCase() === String(s.email).toLowerCase(),
    );
    if (match.length === 1) staffMap.set(s.staff_id, match[0]._id);
  }
  const sourceStatuses = new Map(read('ost_ticket_status').map((s) => [s.id, s]));
  const ticketData = new Map(read('ost_ticket__cdata').map((t) => [t.ticket_id, t]));
  const priorityMap = new Map(
    read('ost_ticket_priority').map((p) => [p.priority_id, String(p.priority_desc).toLowerCase()]),
  );
  const counts = new Map<string, number>();
  for (const t of sourceTickets) counts.set(t.number, (counts.get(t.number) ?? 0) + 1);
  let renamed = 0;
  for (const t of sourceTickets) {
    const status = sourceStatuses.get(t.status_id);
    if (!status || status.state === 'deleted') throw new Error('Unexpected status ' + t.status_id);
    const tid = id('ticket', t.ticket_id),
      cd = ticketData.get(t.ticket_id);
    const collision = existingTickets.some(
      (e) => e.number === t.number && String(e._id) !== String(tid),
    );
    const number =
      collision || (counts.get(t.number) ?? 0) > 1 ? t.number + '-OST-' + t.ticket_id : t.number;
    if (number !== t.number) renamed++;
    let priority = priorityMap.get(cd?.priority) ?? 'normal';
    if (priority === 'emergency') priority = 'urgent';
    if (!['urgent', 'high', 'normal', 'low'].includes(priority)) priority = 'normal';
    preparedTickets.push({
      _id: tid,
      tenantId,
      number,
      subject: cd?.subject || 'Legacy ticket ' + t.number,
      queueId: id('queue', t.dept_id),
      status:
        status.name.toLowerCase() === 'resolved'
          ? 'resolved'
          : status.state === 'closed'
            ? 'closed'
            : 'open',
      priority,
      organisationId: orgIds.get(t.user_id) ?? null,
      contactId: contactIds.get(t.user_id),
      requesterEmail: emails.get(t.user_id),
      requesterName: sourceUsers.find((u) => u.id === t.user_id)?.name,
      assigneeId: staffMap.get(t.staff_id) ?? null,
      channel: t.source === 'Email' ? 'email' : 'agent',
      resolvedAt: status.name.toLowerCase() === 'resolved' ? date(t.closed) : null,
      closedAt: status.name.toLowerCase() === 'closed' ? date(t.closed) : null,
      firstResponseDueAt: null,
      resolutionDueAt: null,
      firstResponseBreached: false,
      resolutionBreached: false,
      customFields: {
        osticketSourceId: t.ticket_id,
        osticketOriginalNumber: t.number,
        osticketOriginalStatus: status.name,
        osticketStaffId: t.staff_id,
        osticketParentId: t.ticket_pid,
        osticketSlaExcluded: true,
        osticketAttachmentsDeferred: true,
        osticketOriginalCreated: t.created,
        osticketOriginalUpdated: t.updated,
      },
      tags: ['osTicket'],
      createdAt: date(t.created),
      updatedAt: date(t.updated, t.created),
      lastActivityAt: date(t.lastupdate, t.updated),
      customerActivityAt: null,
    });
  }
  const threads = new Map(sourceThreads.map((t) => [t.id, t]));
  const ticketKeys = new Set(sourceTickets.map((t) => t.ticket_id));
  const attachmentEntries = new Set(
    read('ost_attachment')
      .filter((a) => a.type === 'H')
      .map((a) => a.object_id),
  );
  for (const e of sourceMessages) {
    const th = threads.get(e.thread_id);
    if (th?.object_type !== 'T' || !ticketKeys.has(th.object_id)) continue;
    if (!['M', 'R', 'N'].includes(e.type)) throw new Error('Unexpected message type');
    preparedMessages.push({
      _id: id('message', e.id),
      tenantId,
      ticketId: id('ticket', th.object_id),
      visibility: e.type === 'N' ? 'internal' : 'public',
      direction: e.type === 'M' ? 'inbound' : 'outbound',
      body: e.body + (attachmentEntries.has(e.id) ? '\n\n[Attachments were not migrated.]' : ''),
      authorUserId: staffMap.get(e.staff_id) ?? null,
      authorContactId: e.user_id ? (contactIds.get(e.user_id) ?? null) : null,
      authorName: e.poster || 'Legacy author',
      channel: e.source === 'Email' ? 'email' : 'agent',
      attachments: [],
      externalMessageId: 'osticket:' + e.id,
      sentAt: date(e.created),
      editedAt: date(e.updated),
      createdAt: date(e.created),
      updatedAt: date(e.updated, e.created),
    });
  }
  if (preparedMessages.length !== 19787) throw new Error('Message reconciliation failed');
  const preparedTicketById = new Map(preparedTickets.map((t) => [String(t._id), t]));
  for (const message of preparedMessages) {
    const ticket = preparedTicketById.get(String(message.ticketId));
    if (!ticket) throw new Error('Orphan prepared message');
    if (
      message.visibility === 'public' &&
      message.direction === 'outbound' &&
      (!ticket.firstRespondedAt || message.sentAt < ticket.firstRespondedAt)
    )
      ticket.firstRespondedAt = message.sentAt;
    if (
      message.direction === 'inbound' &&
      (!ticket.customerActivityAt || message.sentAt > ticket.customerActivityAt)
    )
      ticket.customerActivityAt = message.sentAt;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Batch contains distinct validated document types.
  const batches: [Model<any>, Row[]][] = [
    [UserModel, preparedUsers],
    [ContactModel, preparedContacts],
    [QueueModel, preparedQueues],
    [TicketModel, preparedTickets],
    [TicketMessageModel, preparedMessages],
  ];
  for (const [Model, records] of batches)
    for (const row of records) {
      const doc = new Model(row);
      await doc.validate();
      Object.assign(row, doc.toObject({ flattenMaps: true }));
    }
  // Existing records are never overwritten, so a resumed migration cannot undo subsequent work.
  if (apply) {
    for (const [Model, records] of batches) {
      await Model.init();
      for (let i = 0; i < records.length; i += 250)
        await Model.collection.bulkWrite(
          records.slice(i, i + 250).map((row) => ({
            updateOne: { filter: { _id: row._id }, update: { $setOnInsert: row }, upsert: true },
          })),
        );
    }
    // Bind existing unlinked customer contacts only when their unchanged email/customer still agree.
    for (const d of decisions.filter((d) => !d.staffAccountPreserved))
      await ContactModel.updateOne(
        {
          _id: d.destinationContactId,
          tenantId,
          email: emails.get(d.sourceUserId),
          userId: null,
          organisationId: d.customerId,
        },
        { $set: { userId: d.destinationUserId } },
      );
  }
  const report = {
    mode: apply ? 'applied' : 'dry-run',
    database: mongoose.connection.db!.databaseName,
    tenantId: String(tenantId),
    sourceUsers: sourceUsers.length,
    newUsers: preparedUsers.length,
    newContacts: preparedContacts.length,
    unassigned: decisions.filter((d) => !d.customerId).length,
    existingStaffPreserved: decisions.filter((d) => d.staffAccountPreserved).length,
    tickets: preparedTickets.length,
    messages: preparedMessages.length,
    internalNotes: preparedMessages.filter((m) => m.visibility === 'internal').length,
    renamedTicketNumbers: renamed,
    attachments: 'deferred',
    notificationsQueued: 0,
  };
  if (process.env.OSTICKET_REPORT_DIR) {
    fs.mkdirSync(process.env.OSTICKET_REPORT_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(process.env.OSTICKET_REPORT_DIR, 'import-report.json'),
      JSON.stringify(report, null, 2),
    );
    fs.writeFileSync(
      path.join(process.env.OSTICKET_REPORT_DIR, 'identity-mapping.json'),
      JSON.stringify(decisions, null, 2),
    );
  }
  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Import failed');
  process.exitCode = 1;
  void mongoose.disconnect();
});

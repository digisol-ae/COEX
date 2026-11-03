import { randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { Types } from 'mongoose';
import {
  ResourceModel,
  ResourceShareModel,
  ResourceAccessModel,
} from '@coex/shared/resources/models';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import { ContactModel } from '@coex/shared/crm/models/contact.model';
import { TicketModel } from '@coex/shared/tickets/models/ticket.model';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { connectToDatabase } from '@/lib/db';
import { getContext, runWithContext } from '@/lib/tenant-context';
import { fileStorage } from '@/lib/storage';
import { queueEmail } from '@/modules/core/services/email.service';
import { recordAudit } from '@/modules/core/services/audit.service';
import { addReply, customerReplyAddress } from '@/modules/tickets/services/ticket.service';
import { parseVideoLink } from '@/modules/tutorials/video-link';
import { digest, documentType, otpDigest, shareExpiry, safeFileName } from './rules';

const invalid = () => new Error('This resource link is unavailable or expired.');
const objectId = (id: string) => {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new Error('Not found.');
  return new Types.ObjectId(id);
};
const escaped = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export interface ResourceView {
  id: string;
  title: string;
  description: string;
  product: string;
  category: string;
  kind: 'document' | 'video';
  status: 'draft' | 'published' | 'archived';
  fileName: string | null;
  contentType: string | null;
  bytes: number;
  videoUrl: string | null;
}
export async function listResources(search = '', publishedOnly = false): Promise<ResourceView[]> {
  await connectToDatabase();
  const rows = await ResourceModel.find({
    tenantId: getContext().tenantId,
    ...(publishedOnly ? { status: 'published' } : {}),
    ...(search.trim()
      ? {
          $or: ['title', 'product', 'category', 'description'].map((field) => ({
            [field]: new RegExp(escaped(search.trim().slice(0, 120)), 'i'),
          })),
        }
      : {}),
  })
    .sort({ updatedAt: -1 })
    .limit(200);
  return rows.map((row) => ({
    id: String(row._id),
    title: row.title,
    description: row.description,
    product: row.product,
    category: row.category,
    kind: row.kind as ResourceView['kind'],
    status: row.status as ResourceView['status'],
    fileName: row.fileName ?? null,
    contentType: row.contentType ?? null,
    bytes: row.bytes,
    videoUrl: row.videoUrl ?? null,
  }));
}
export async function saveResource(input: {
  id?: string;
  title: string;
  description?: string;
  product?: string;
  category?: string;
  videoUrl?: string;
  status?: string;
  file?: { name: string; body: Buffer };
}) {
  await connectToDatabase();
  const { tenantId, userId } = getContext();
  const title = input.title.trim();
  if (!title || title.length > 160) throw new Error('Enter a title up to 160 characters.');
  const status = input.status ?? 'draft';
  if (!['draft', 'published', 'archived'].includes(status))
    throw new Error('Choose a valid resource status.');
  const metadata = {
    title,
    description: (input.description ?? '').trim().slice(0, 4000),
    product: (input.product ?? '').trim().slice(0, 100),
    category: (input.category ?? '').trim().slice(0, 100),
    status: status as ResourceView['status'],
  };
  let id: Types.ObjectId;
  if (input.id) {
    const row = await ResourceModel.findOneAndUpdate(
      { _id: objectId(input.id), tenantId },
      { $set: metadata },
      { returnDocument: 'after' },
    );
    if (!row) throw new Error('Resource not found.');
    id = row._id;
  } else {
    if (Boolean(input.file) === Boolean(input.videoUrl?.trim()))
      throw new Error('Choose one document or one video link.');
    const file = input.file;
    const contentType = file ? documentType(file.name, file.body) : null;
    const video = input.videoUrl?.trim();
    if (video) parseVideoLink(video);
    const stored = file
      ? await fileStorage().put({
          tenantId: String(tenantId),
          fileName: safeFileName(file.name),
          contentType: contentType!,
          body: file.body,
        })
      : null;
    try {
      const row = await ResourceModel.create({
        ...metadata,
        tenantId,
        createdBy: userId,
        kind: file ? 'document' : 'video',
        fileKey: stored?.key ?? null,
        fileName: file ? safeFileName(file.name) : null,
        bytes: stored?.bytes ?? 0,
        contentType,
        videoUrl: video ?? null,
      });
      id = row._id;
    } catch (error) {
      if (stored) await fileStorage().remove(stored.key);
      throw error;
    }
  }
  await recordAudit({
    action: 'resource.saved',
    entityType: 'Resource',
    entityId: id,
    after: { title, status },
  });
  return String(id);
}
export async function staffResourceFile(id: string) {
  await connectToDatabase();
  const row = await ResourceModel.findOne({
    _id: objectId(id),
    tenantId: getContext().tenantId,
    kind: 'document',
  });
  if (!row?.fileKey || !row.contentType || !row.fileName) throw new Error('Document not found.');
  return {
    body: await fileStorage().get(row.fileKey),
    fileName: row.fileName ?? null,
    contentType: row.contentType ?? null,
  };
}
export async function resourceRecipients(search: string) {
  await connectToDatabase();
  if (search.trim().length < 2) return [];
  const tenantId = getContext().tenantId;
  const regex = new RegExp(escaped(search.trim().slice(0, 100)), 'i');
  const organisations = await OrganisationModel.find({
    tenantId,
    deletedAt: null,
    status: 'active',
    kind: 'client',
    $or: [{ name: regex }, { email: regex }],
  })
    .select('name email')
    .limit(25);
  const contacts = await ContactModel.find({
    tenantId,
    deletedAt: null,
    status: 'active',
    email: { $ne: null },
    $or: [
      { name: regex },
      { email: regex },
      { organisationId: { $in: organisations.map((o) => o._id) } },
    ],
  })
    .select('name email organisationId')
    .limit(25);
  const parents = await OrganisationModel.find({
    tenantId,
    deletedAt: null,
    status: 'active',
    kind: 'client',
    _id: { $in: contacts.map((c) => c.organisationId) },
  }).select('name');
  const names = new Map(parents.map((o) => [String(o._id), o.name]));
  return [
    ...organisations
      .filter((o) => o.email)
      .map((o) => ({
        organisationId: String(o._id),
        email: o.email!,
        label: `${o.name} · ${o.email}`,
      })),
    ...contacts
      .filter((c) => c.email && names.has(String(c.organisationId)))
      .map((c) => ({
        organisationId: String(c.organisationId),
        email: c.email!,
        label: `${c.name} · ${names.get(String(c.organisationId))} · ${c.email}`,
      })),
  ]
    .filter(
      (r, i, all) =>
        all.findIndex((x) => x.organisationId === r.organisationId && x.email === r.email) === i,
    )
    .slice(0, 30);
}
export async function ticketShareTarget(
  ticketId: string,
  actor: { id: string; permissions: readonly string[] },
) {
  await connectToDatabase();
  const ticket = await TicketModel.findOne({
    _id: objectId(ticketId),
    tenantId: getContext().tenantId,
    deletedAt: null,
  });
  if (
    !ticket ||
    (!actor.permissions.includes('ticket.read.all') && String(ticket.assigneeId) !== actor.id)
  )
    throw new Error('Ticket not found.');
  if (!ticket.organisationId) throw new Error('Link this ticket to an existing customer first.');
  const email = await customerReplyAddress(ticketId);
  if (!email) throw new Error('This ticket has no customer email address.');
  return {
    organisationId: String(ticket.organisationId),
    email,
    label: `${ticket.number} · ${email}`,
  };
}
export interface ShareInput {
  resourceIds: string[];
  organisationId: string;
  recipientEmail: string;
  title: string;
  message?: string;
  hours?: number;
  ticketId?: string;
  requestKey: string;
}
function baseUrl() {
  const url = new URL(process.env.COEX_APP_URL ?? process.env.AUTH_URL ?? 'http://localhost:3100');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new Error('Configure the Worktello public URL.');
  return url.origin;
}
const accessUrl = (token: string) => `${baseUrl()}/shared/resources/${token}`;
export async function createResourceShare(
  input: ShareInput,
  actor: { id: string; permissions: readonly string[] },
) {
  await connectToDatabase();
  await ResourceShareModel.init();
  const { tenantId, userId } = getContext();
  if (!/^[\w-]{16,80}$/.test(input.requestKey))
    throw new Error('Refresh the sharing form and try again.');
  const existing = await ResourceShareModel.findOne({ tenantId, requestKey: input.requestKey });
  if (existing) {
    if (existing.deliveryStatus === 'queued') return String(existing._id);
    throw new Error(
      'This share is already being prepared or could not be sent. Refresh and try again.',
    );
  }
  const expiresAt = shareExpiry(input.hours);
  const title = input.title.trim();
  if (!title || title.length > 160) throw new Error('Enter an email subject up to 160 characters.');
  if ((input.message ?? '').length > 4000)
    throw new Error('Keep the message under 4,000 characters.');
  const organisationId = objectId(input.organisationId);
  const email = input.recipientEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    throw new Error('Choose a valid customer email.');
  const organisation = await OrganisationModel.findOne({
    _id: organisationId,
    tenantId,
    deletedAt: null,
    status: 'active',
    kind: 'client',
  });
  if (!organisation) throw new Error('Customer not found.');
  if (input.ticketId) {
    if (!actor.permissions.includes('ticket.manage'))
      throw new Error('You cannot reply to this ticket.');
    const target = await ticketShareTarget(input.ticketId, actor);
    if (target.organisationId !== input.organisationId || target.email.toLowerCase() !== email)
      throw new Error('The recipient must be this ticket’s customer reply address.');
  } else if (!actor.permissions.includes('customer.read')) {
    throw new Error('Customer read permission is required to share directly.');
  } else if (
    organisation.email?.toLowerCase() !== email &&
    !(await ContactModel.exists({
      tenantId,
      organisationId,
      email,
      status: 'active',
      deletedAt: null,
    }))
  ) {
    throw new Error('Choose an existing contact belonging to this customer.');
  }
  const ids = [...new Set(input.resourceIds)];
  if (!ids.length || ids.length > 20)
    throw new Error('Select between 1 and 20 published resources.');
  const resources = await ResourceModel.find({
    _id: { $in: ids.map(objectId) },
    tenantId,
    status: 'published',
  });
  if (resources.length !== ids.length)
    throw new Error('Only published resources from this workspace can be shared.');
  const token = randomBytes(32).toString('base64url');
  const code = String(randomInt(10000000, 100000000));
  const nonce = randomUUID();
  const id = new Types.ObjectId();
  const share = await ResourceShareModel.create({
    _id: id,
    tenantId,
    organisationId,
    recipientEmail: email,
    title,
    message: input.message ?? '',
    resources: resources.map((r) => ({
      resourceId: r._id,
      title: r.title,
      description: r.description,
      kind: r.kind,
      fileKey: r.fileKey,
      fileName: r.fileName,
      contentType: r.contentType,
      videoUrl: r.videoUrl,
    })),
    tokenHash: digest(token),
    requestKey: input.requestKey,
    ticketId: input.ticketId ? objectId(input.ticketId) : null,
    createdBy: userId,
    expiresAt,
    otpHash: otpDigest(String(id), nonce, code),
    otpNonce: nonce,
    otpSentAt: new Date(),
  });
  try {
    const queued = await queueEmail({
      kind: 'resource_share',
      sender: 'standard',
      to: email,
      subject: title,
      text: [
        input.message ?? '',
        'Resources shared with you:',
        ...resources.map((r) => `• ${r.title}`),
        '',
        `Open: ${accessUrl(token)}`,
        `One-time code: ${code}`,
        `Link and unused code expire: ${expiresAt.toISOString()}`,
        'No Worktello account or sign-in is needed. Enter the code once in your browser.',
      ].join('\n'),
    });
    if (!queued)
      throw new Error('Email sending is disabled or unavailable. The resources were not shared.');
    let ticketMessageId: string | null = null;
    if (input.ticketId)
      ticketMessageId = await addReply({
        ticketId: input.ticketId,
        visibility: 'public',
        body: [
          input.message ?? '',
          title,
          ...resources.map((r) => `• ${r.title}`),
          accessUrl(token),
          'A one-time code has been emailed separately to the ticket recipient.',
          `Access expires: ${expiresAt.toISOString()}`,
        ].join('\n'),
      });
    await ResourceShareModel.updateOne(
      { _id: id, tenantId },
      { $set: { deliveryStatus: 'queued', ticketMessageId } },
    );
    await recordAudit({
      action: 'resource.shared',
      entityType: 'ResourceShare',
      entityId: id,
      after: {
        recipientEmail: email,
        resourceIds: ids,
        expiresAt,
        ticketId: input.ticketId ?? null,
      },
    });
    return String(share._id);
  } catch (error) {
    await ResourceShareModel.updateOne(
      { _id: id, tenantId },
      { $set: { revokedAt: new Date(), deliveryStatus: 'failed' } },
    );
    throw error;
  }
}
export async function shareHistory() {
  await connectToDatabase();
  const rows = await ResourceShareModel.find({ tenantId: getContext().tenantId })
    .sort({ createdAt: -1 })
    .limit(100);
  return rows.map((r) => ({
    id: String(r._id),
    title: r.title,
    recipientEmail: r.recipientEmail,
    expiresAt: r.expiresAt.toISOString(),
    revoked: Boolean(r.revokedAt),
    status: r.deliveryStatus,
    createdAt: r.createdAt.toISOString(),
    openedAt: r.firstOpenedAt?.toISOString() ?? null,
    downloads: r.downloads,
    ticketId: r.ticketId ? String(r.ticketId) : null,
  }));
}
export async function revokeResourceShare(id: string) {
  await connectToDatabase();
  const row = await ResourceShareModel.findOneAndUpdate(
    { _id: objectId(id), tenantId: getContext().tenantId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
  if (!row) throw new Error('Share not found or already revoked.');
  await recordAudit({
    action: 'resource.share_revoked',
    entityType: 'ResourceShare',
    entityId: row._id,
  });
}
// These entry points intentionally do not use staff sessions: the random capability locates one
// share, and a separately verified browser credential authorizes its selected resources only.
export async function publicShare(token: string) {
  if (!/^[\w-]{43}$/.test(token)) return null;
  await connectToDatabase();
  const share = await ResourceShareModel.findOne({
    tokenHash: digest(token),
    expiresAt: { $gt: new Date() },
    revokedAt: null,
    deliveryStatus: 'queued',
  });
  if (!share || !(await TenantModel.exists({ _id: share.tenantId, status: 'active' }))) return null;
  return share;
}
export async function verifiedShare(token: string, browserToken?: string) {
  const share = await publicShare(token);
  if (!share || !browserToken || !/^[\w-]{43}$/.test(browserToken)) return null;
  if (
    !(await ResourceAccessModel.exists({
      tenantId: share.tenantId,
      shareId: share._id,
      tokenHash: digest(browserToken),
      expiresAt: { $gt: new Date() },
    }))
  )
    return null;
  return share;
}
export async function verifyResourceOtp(token: string, code: string) {
  const share = await publicShare(token);
  if (!share || !/^\d{8}$/.test(code)) throw new Error('Code is invalid, used or expired.');
  const attempt = await ResourceShareModel.findOneAndUpdate(
    {
      _id: share._id,
      tenantId: share.tenantId,
      otpUsedAt: null,
      otpAttempts: { $lt: 5 },
      expiresAt: { $gt: new Date() },
      revokedAt: null,
      deliveryStatus: 'queued',
    },
    { $inc: { otpAttempts: 1 } },
    { returnDocument: 'after' },
  ).select('+otpHash +otpNonce');
  if (!attempt?.otpHash || !attempt.otpNonce)
    throw new Error('Code is invalid, used or expired. Request a new code.');
  const candidate = otpDigest(String(share._id), attempt.otpNonce, code);
  if (!timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(attempt.otpHash, 'hex')))
    throw new Error('Code is invalid, used or expired.');
  const claimed = await ResourceShareModel.updateOne(
    {
      _id: share._id,
      tenantId: share.tenantId,
      otpHash: candidate,
      otpNonce: attempt.otpNonce,
      otpUsedAt: null,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { otpUsedAt: new Date() } },
  );
  if (claimed.modifiedCount !== 1) throw new Error('Code is invalid, used or expired.');
  const browserToken = randomBytes(32).toString('base64url');
  await ResourceAccessModel.create({
    shareId: share._id,
    tenantId: share.tenantId,
    tokenHash: digest(browserToken),
    expiresAt: share.expiresAt,
  });
  await ResourceShareModel.updateOne(
    { _id: share._id, firstOpenedAt: null },
    { $set: { firstOpenedAt: new Date() } },
  );
  await ResourceShareModel.updateOne({ _id: share._id }, { $set: { lastOpenedAt: new Date() } });
  return { browserToken, shareId: String(share._id), expiresAt: share.expiresAt };
}
export async function resendResourceOtp(token: string) {
  const share = await publicShare(token);
  if (!share) throw invalid();
  const now = new Date();
  const code = String(randomInt(10000000, 100000000));
  const nonce = randomUUID();
  const updated = await ResourceShareModel.findOneAndUpdate(
    {
      _id: share._id,
      tenantId: share.tenantId,
      revokedAt: null,
      expiresAt: { $gt: now },
      deliveryStatus: 'queued',
      otpSendCount: { $lt: 10 },
      otpSentAt: { $lte: new Date(now.getTime() - 60000) },
    },
    {
      $set: {
        otpHash: otpDigest(String(share._id), nonce, code),
        otpNonce: nonce,
        otpUsedAt: null,
        otpAttempts: 0,
        otpSentAt: now,
      },
      $inc: { otpSendCount: 1 },
    },
    { returnDocument: 'after' },
  );
  if (!updated)
    throw new Error(
      'Please wait at least one minute before requesting another code. Up to ten codes can be emailed per share.',
    );
  const queued = await runWithContext(
    { tenantId: share.tenantId, userId: share.createdBy, isPlatformAdmin: false },
    () =>
      queueEmail({
        kind: 'resource_share',
        sender: 'standard',
        to: share.recipientEmail,
        subject: `New code: ${share.title}`,
        text: `Open: ${accessUrl(token)}\nOne-time code: ${code}\nLink and unused code expire: ${share.expiresAt.toISOString()}\nThis replaces the previous code and does not extend access.`,
      }),
  );
  if (!queued)
    throw new Error(
      'The code could not be emailed. Please contact the person who shared these resources.',
    );
}
export async function publicResources(token: string, browserToken?: string) {
  const share = await verifiedShare(token, browserToken);
  if (!share) throw invalid();
  const available = await ResourceModel.find({
    tenantId: share.tenantId,
    _id: { $in: share.resources.map((r) => r.resourceId) },
    status: 'published',
  }).select('_id');
  const ids = new Set(available.map((r) => String(r._id)));
  return { share, resources: share.resources.filter((r) => ids.has(String(r.resourceId))) };
}
export async function sharedDocument(
  token: string,
  browserToken: string | undefined,
  resourceId: string,
  download: boolean,
) {
  const { share, resources } = await publicResources(token, browserToken);
  const resource = resources.find(
    (r) => String(r.resourceId) === resourceId && r.kind === 'document',
  );
  if (
    !resource?.fileKey ||
    !resource.fileName ||
    !resource.contentType ||
    !resource.fileKey.startsWith(`${share.tenantId}/`)
  )
    throw invalid();
  const body = await fileStorage().get(resource.fileKey);
  if (download)
    await ResourceShareModel.updateOne(
      { _id: share._id, tenantId: share.tenantId },
      { $inc: { downloads: 1 } },
    );
  return { body, fileName: resource.fileName, contentType: resource.contentType };
}

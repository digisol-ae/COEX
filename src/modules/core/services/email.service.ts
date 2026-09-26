import { Types } from 'mongoose';
import nodemailer, { type Transporter } from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { openSecret, sealSecret } from '@/lib/secret-box';
import { fileStorage } from '@/lib/storage';
import { EmailSettingsModel } from '../models/email-settings.model';
import { EmailOutboxModel } from '../models/email-outbox.model';
import { UserModel } from '../models/user.model';
import { recordAudit } from './audit.service';

/**
 * Email for a tenant: its settings, the outbox every request writes to, and the delivery the email
 * worker runs. Requests never talk to an SMTP server; they queue, and the worker sends and retries.
 *
 * Customer facing mail (auto replies and public ticket replies) and staff alerts share one SMTP
 * account, configured in Setup, Email.
 */

export type OutboxKind =
  | 'auto_reply'
  | 'ticket_reply'
  | 'ticket_assigned'
  | 'customer_replied'
  | 'task_assigned'
  | 'mentioned'
  | 'test';

type StaffAlert = 'ticket_assigned' | 'customer_replied' | 'task_assigned' | 'mentioned';

const MAX_ATTEMPTS = 5;

export function appBaseUrl(): string {
  return (process.env.COEX_APP_URL ?? process.env.AUTH_URL ?? 'https://coex.digisol.ae').replace(
    /\/+$/,
    '',
  );
}

function isEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function settingsFor(tenantId: Types.ObjectId | string) {
  await connectToDatabase();
  return EmailSettingsModel.findOne({ tenantId });
}

/* ------------------------------------------------------------------------------------------------
 * Settings, as the Setup screen sees them. Passwords never leave the server; the screen only learns
 * whether one is stored.
 * ---------------------------------------------------------------------------------------------- */

export interface EmailSettingsView {
  inbound: {
    enabled: boolean;
    host: string;
    port: number;
    secure: boolean;
    username: string;
    hasPassword: boolean;
    queueId: string | null;
    started: boolean;
    lastCheckedAt: Date | null;
    lastError: string | null;
  };
  outbound: {
    enabled: boolean;
    host: string;
    port: number;
    secure: boolean;
    username: string;
    hasPassword: boolean;
    fromName: string;
    fromAddress: string;
    lastError: string | null;
  };
  customer: {
    autoReplyEnabled: boolean;
    autoReplyBody: string;
    emailPublicReplies: boolean;
  };
  staff: {
    ticketAssigned: boolean;
    customerReplied: boolean;
    taskAssigned: boolean;
    mentioned: boolean;
  };
  pendingCount: number;
  failedCount: number;
}

async function settingsDocument() {
  const { tenantId } = getContext();
  await connectToDatabase();
  return (
    (await EmailSettingsModel.findOne({ tenantId })) ??
    (await EmailSettingsModel.create({ tenantId }))
  );
}

export async function getEmailSettings(): Promise<EmailSettingsView> {
  const settings = await settingsDocument();
  const { tenantId } = getContext();
  const [pendingCount, failedCount] = await Promise.all([
    EmailOutboxModel.countDocuments({ tenantId, status: { $in: ['pending', 'sending'] } }),
    EmailOutboxModel.countDocuments({ tenantId, status: 'failed' }),
  ]);
  const inbound = settings.inbound!;
  const outbound = settings.outbound!;
  const customer = settings.customer!;
  const staff = settings.staff!;

  return {
    inbound: {
      enabled: inbound.enabled ?? false,
      host: inbound.host ?? '',
      port: inbound.port ?? 993,
      secure: inbound.secure ?? true,
      username: inbound.username ?? '',
      hasPassword: Boolean(inbound.passwordSealed),
      queueId: inbound.queueId ? String(inbound.queueId) : null,
      started: inbound.lastUid !== null && inbound.lastUid !== undefined,
      lastCheckedAt: inbound.lastCheckedAt ?? null,
      lastError: inbound.lastError ?? null,
    },
    outbound: {
      enabled: outbound.enabled ?? false,
      host: outbound.host ?? '',
      port: outbound.port ?? 465,
      secure: outbound.secure ?? true,
      username: outbound.username ?? '',
      hasPassword: Boolean(outbound.passwordSealed),
      fromName: outbound.fromName ?? '',
      fromAddress: outbound.fromAddress ?? '',
      lastError: outbound.lastError ?? null,
    },
    customer: {
      autoReplyEnabled: customer.autoReplyEnabled ?? false,
      autoReplyBody: customer.autoReplyBody ?? '',
      emailPublicReplies: customer.emailPublicReplies ?? true,
    },
    staff: {
      ticketAssigned: staff.ticketAssigned ?? true,
      customerReplied: staff.customerReplied ?? true,
      taskAssigned: staff.taskAssigned ?? true,
      mentioned: staff.mentioned ?? true,
    },
    pendingCount,
    failedCount,
  };
}

export interface EmailSettingsInput {
  inbound: {
    enabled: boolean;
    host: string;
    port: number;
    secure: boolean;
    username: string;
    /** Blank keeps the stored password. */
    password: string;
    queueId: string | null;
  };
  outbound: {
    enabled: boolean;
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    fromName: string;
    fromAddress: string;
  };
  customer: EmailSettingsView['customer'];
  staff: EmailSettingsView['staff'];
}

export async function saveEmailSettings(input: EmailSettingsInput): Promise<void> {
  const settings = await settingsDocument();
  const context = getContext();
  const inbound = settings.inbound!;
  const outbound = settings.outbound!;

  const inboundHost = input.inbound.host.trim();
  const inboundUser = input.inbound.username.trim();
  const inboundPassword = input.inbound.password
    ? sealSecret(input.inbound.password)
    : inbound.passwordSealed;

  if (input.inbound.enabled) {
    if (!inboundHost || !inboundUser)
      throw new Error('The support mailbox needs a server and a username.');
    if (!inboundPassword) throw new Error('Enter the support mailbox password.');
    if (!input.inbound.queueId) throw new Error('Choose the queue new email tickets go to.');
  }

  // A different mailbox starts from its own newest message, never from the old mailbox's position.
  const mailboxChanged = inboundHost !== inbound.host || inboundUser !== inbound.username;
  const turnedOn = input.inbound.enabled && !inbound.enabled;

  inbound.enabled = input.inbound.enabled;
  inbound.host = inboundHost;
  inbound.port = input.inbound.port || 993;
  inbound.secure = input.inbound.secure;
  inbound.username = inboundUser;
  inbound.passwordSealed = inboundPassword ?? null;
  inbound.queueId = input.inbound.queueId ? new Types.ObjectId(input.inbound.queueId) : null;
  if (mailboxChanged) {
    inbound.lastUid = null;
    inbound.retryUid = null;
    inbound.retryAttempts = 0;
  }
  if (turnedOn || mailboxChanged || !inbound.actorUserId) inbound.actorUserId = context.userId;
  if (input.inbound.password || mailboxChanged) inbound.lastError = null;

  const fromAddress = input.outbound.fromAddress.trim().toLowerCase();
  const outboundPassword = input.outbound.password
    ? sealSecret(input.outbound.password)
    : outbound.passwordSealed;

  if (input.outbound.enabled) {
    if (!input.outbound.host.trim()) throw new Error('The sending account needs an SMTP server.');
    if (!isEmailAddress(fromAddress)) throw new Error('Enter a valid From address.');
    if (input.outbound.username.trim() && !outboundPassword) {
      throw new Error('Enter the sending account password.');
    }
  }

  outbound.enabled = input.outbound.enabled;
  outbound.host = input.outbound.host.trim();
  outbound.port = input.outbound.port || 465;
  outbound.secure = input.outbound.secure;
  outbound.username = input.outbound.username.trim();
  outbound.passwordSealed = outboundPassword ?? null;
  outbound.fromName = input.outbound.fromName.trim();
  outbound.fromAddress = fromAddress;
  if (input.outbound.password) outbound.lastError = null;

  if (input.customer.autoReplyEnabled && !input.customer.autoReplyBody.trim()) {
    throw new Error('Write the automatic reply, or turn it off.');
  }
  settings.customer = {
    autoReplyEnabled: input.customer.autoReplyEnabled,
    autoReplyBody: input.customer.autoReplyBody.trim(),
    emailPublicReplies: input.customer.emailPublicReplies,
  };
  settings.staff = { ...input.staff };
  settings.updatedById = context.userId;

  await settings.save();

  // Settings, never secrets, go to the audit log.
  await recordAudit({
    action: 'email.settings.updated',
    entityType: 'EmailSettings',
    entityId: settings._id,
    after: {
      inboundEnabled: inbound.enabled,
      inboundMailbox: inbound.username,
      outboundEnabled: outbound.enabled,
      fromAddress: outbound.fromAddress,
      autoReply: input.customer.autoReplyEnabled,
      emailPublicReplies: input.customer.emailPublicReplies,
      staff: input.staff,
    },
  });
}

/* ------------------------------------------------------------------------------------------------
 * Queueing.
 * ---------------------------------------------------------------------------------------------- */

/** A Message-ID we choose ourselves, so replies to it can be matched back to the ticket. */
export async function newMessageId(): Promise<string> {
  const settings = await settingsFor(getContext().tenantId);
  const domain =
    settings?.outbound?.fromAddress?.split('@')[1] ??
    new URL(appBaseUrl()).hostname ??
    'coex.local';
  return `<${new Types.ObjectId().toHexString()}.coex@${domain}>`;
}

export interface QueueEmailInput {
  kind: OutboxKind;
  to: string;
  subject: string;
  text: string;
  messageId?: string | null;
  inReplyTo?: string | null;
  references?: string[];
  ticketMessageId?: Types.ObjectId | string | null;
  /** Gives attachments saved just after a reply time to land before the email goes. */
  delaySeconds?: number;
}

/**
 * Queues an email when the tenant's settings allow that kind. Returns false, and queues nothing,
 * when sending is off, the kind is switched off, or the address is not usable.
 */
export async function queueEmail(input: QueueEmailInput): Promise<boolean> {
  const { tenantId } = getContext();
  const settings = await settingsFor(tenantId);
  if (!settings?.outbound?.enabled) return false;

  const to = input.to.trim().toLowerCase();
  if (!isEmailAddress(to)) return false;

  const allowed: Record<OutboxKind, boolean> = {
    auto_reply: settings.customer?.autoReplyEnabled ?? false,
    ticket_reply: settings.customer?.emailPublicReplies ?? true,
    ticket_assigned: settings.staff?.ticketAssigned ?? true,
    customer_replied: settings.staff?.customerReplied ?? true,
    task_assigned: settings.staff?.taskAssigned ?? true,
    mentioned: settings.staff?.mentioned ?? true,
    test: true,
  };
  if (!allowed[input.kind]) return false;

  await EmailOutboxModel.create({
    tenantId,
    kind: input.kind,
    to,
    subject: input.subject,
    text: input.text,
    messageId: input.messageId ?? null,
    inReplyTo: input.inReplyTo ?? null,
    references: input.references ?? [],
    ticketMessageId: input.ticketMessageId
      ? new Types.ObjectId(String(input.ticketMessageId))
      : null,
    sendAfter: new Date(Date.now() + (input.delaySeconds ?? 0) * 1000),
  });

  return true;
}

/** Whether a public reply on a ticket will be emailed, so the reply box can say so. */
export async function publicRepliesAreEmailed(): Promise<boolean> {
  const settings = await settingsFor(getContext().tenantId);
  return Boolean(settings?.outbound?.enabled && (settings.customer?.emailPublicReplies ?? true));
}

/** Addresses that are ours, so our own mail is never imported as a ticket or answered. */
export async function ownEmailAddresses(tenantId: Types.ObjectId | string): Promise<string[]> {
  const settings = await settingsFor(tenantId);
  return [
    settings?.inbound?.username,
    settings?.outbound?.fromAddress,
    settings?.outbound?.username,
  ]
    .filter((value): value is string => Boolean(value && value.includes('@')))
    .map((value) => value.toLowerCase());
}

/** A new auto reply to the same person within this window is skipped, which stops mail loops. */
export async function autoReplySentRecently(to: string): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  return Boolean(
    await EmailOutboxModel.exists({
      tenantId: getContext().tenantId,
      kind: 'auto_reply',
      to: to.toLowerCase(),
      createdAt: { $gte: since },
    }),
  );
}

/**
 * Alerts a member of staff. Nobody is alerted about their own action: assigning yourself a ticket
 * is not news.
 */
export async function alertStaff(
  kind: StaffAlert,
  userId: Types.ObjectId | string | null | undefined,
  subject: string,
  lines: string[],
): Promise<void> {
  if (!userId) return;
  const context = getContext();
  if (String(userId) === String(context.userId)) return;

  const user = await UserModel.findOne({ _id: userId, tenantId: context.tenantId }).select(
    'email name',
  );
  if (!user?.email) return;

  await queueEmail({
    kind,
    to: user.email,
    subject,
    text: [`Hello ${user.name},`, '', ...lines, '', 'This is an automatic message from COEX.'].join(
      '\n',
    ),
  });
}

/** Adds the attachments of a ticket reply to its queued email once they are stored. */
export async function attachFilesToQueuedEmail(
  ticketMessageId: Types.ObjectId | string,
  files: { fileName: string; contentType: string; storageKey: string }[],
): Promise<void> {
  if (files.length === 0) return;
  await EmailOutboxModel.updateMany(
    { tenantId: getContext().tenantId, ticketMessageId, status: 'pending' },
    { $push: { attachments: { $each: files } } },
  );
}

/* ------------------------------------------------------------------------------------------------
 * Delivery. Runs in the email worker, outside any request, so it scopes by tenant explicitly.
 * ---------------------------------------------------------------------------------------------- */

function transportFor(settings: NonNullable<Awaited<ReturnType<typeof settingsFor>>>): Transporter {
  const outbound = settings.outbound!;
  const password = openSecret(outbound.passwordSealed);
  return nodemailer.createTransport({
    host: outbound.host,
    port: outbound.port ?? 465,
    secure: outbound.secure ?? true,
    auth: outbound.username ? { user: outbound.username, pass: password ?? '' } : undefined,
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
  });
}

function fromHeader(settings: NonNullable<Awaited<ReturnType<typeof settingsFor>>>): string {
  const outbound = settings.outbound!;
  return outbound.fromName
    ? `"${outbound.fromName.replace(/"/g, '')}" <${outbound.fromAddress}>`
    : outbound.fromAddress!;
}

/** Sends due email, a batch at a time. Returns how many were sent. */
export async function deliverQueuedEmail(limit = 20): Promise<number> {
  await connectToDatabase();

  // A worker that died mid send leaves rows in "sending"; hand them back after ten minutes.
  await EmailOutboxModel.updateMany(
    { status: 'sending', updatedAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) } },
    { $set: { status: 'pending' } },
  );

  let sent = 0;
  const transports = new Map<string, Transporter>();

  for (let index = 0; index < limit; index += 1) {
    const row = await EmailOutboxModel.findOneAndUpdate(
      { status: 'pending', sendAfter: { $lte: new Date() } },
      { $set: { status: 'sending' }, $inc: { attempts: 1 } },
      { sort: { sendAfter: 1 }, returnDocument: 'after' },
    ).lean<
      Record<string, unknown> & { _id: Types.ObjectId; tenantId: Types.ObjectId; attempts: number }
    >();
    if (!row) break;

    const settings = await settingsFor(row.tenantId);
    try {
      if (!settings?.outbound?.enabled)
        throw new Error('Sending email is turned off in Setup, Email.');

      const key = String(row.tenantId);
      const transport = transports.get(key) ?? transportFor(settings);
      transports.set(key, transport);

      const stored =
        (row.attachments as
          { fileName: string; contentType: string; storageKey: string }[] | undefined) ?? [];
      const attachments = await Promise.all(
        stored.map(async (file) => ({
          filename: file.fileName,
          contentType: file.contentType,
          content: await fileStorage().get(file.storageKey),
        })),
      );

      await transport.sendMail({
        from: fromHeader(settings),
        to: String(row.to),
        subject: String(row.subject),
        text: String(row.text),
        messageId: (row.messageId as string | null) ?? undefined,
        inReplyTo: (row.inReplyTo as string | null) ?? undefined,
        references: (row.references as string[] | undefined)?.length
          ? (row.references as string[])
          : undefined,
        headers: row.kind === 'auto_reply' ? { 'Auto-Submitted': 'auto-replied' } : undefined,
        attachments,
      });

      await EmailOutboxModel.updateOne(
        { _id: row._id },
        { $set: { status: 'sent', sentAt: new Date(), lastError: null } },
      );
      if (settings.outbound.lastError) {
        await EmailSettingsModel.updateOne(
          { _id: settings._id },
          { $set: { 'outbound.lastError': null } },
        );
      }
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const giveUp = row.attempts >= MAX_ATTEMPTS;
      await EmailOutboxModel.updateOne(
        { _id: row._id },
        {
          $set: {
            status: giveUp ? 'failed' : 'pending',
            lastError: message,
            // Back off: 2, 4, 8, 16 minutes.
            sendAfter: new Date(Date.now() + 2 ** row.attempts * 60 * 1000),
          },
        },
      );
      if (settings) {
        await EmailSettingsModel.updateOne(
          { _id: settings._id },
          { $set: { 'outbound.lastError': message } },
        );
      }
    }
  }

  for (const transport of transports.values()) transport.close();
  return sent;
}

/* ------------------------------------------------------------------------------------------------
 * The support mailbox, for the email worker.
 * ---------------------------------------------------------------------------------------------- */

export interface MailboxConfig {
  settingsId: Types.ObjectId;
  tenantId: Types.ObjectId;
  actorUserId: Types.ObjectId;
  queueId: Types.ObjectId;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  lastUid: number | null;
  retryUid: number | null;
  retryAttempts: number;
  /** Changes whenever the settings are saved, so the worker knows to reconnect. */
  version: string;
}

/** Every tenant with mailbox intake switched on and complete. */
export async function enabledMailboxes(): Promise<MailboxConfig[]> {
  await connectToDatabase();
  const found = await EmailSettingsModel.find({ 'inbound.enabled': true });
  const configs: MailboxConfig[] = [];

  for (const settings of found) {
    const inbound = settings.inbound!;
    if (!inbound.host || !inbound.username || !inbound.queueId || !inbound.actorUserId) continue;
    let password: string | null = null;
    try {
      password = openSecret(inbound.passwordSealed);
    } catch (error) {
      await recordMailboxProgress(settings._id, {
        lastError: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
    if (!password) continue;

    configs.push({
      settingsId: settings._id,
      tenantId: settings.tenantId,
      actorUserId: inbound.actorUserId,
      queueId: inbound.queueId,
      host: inbound.host,
      port: inbound.port ?? 993,
      secure: inbound.secure ?? true,
      username: inbound.username,
      password,
      lastUid: inbound.lastUid ?? null,
      retryUid: inbound.retryUid ?? null,
      retryAttempts: inbound.retryAttempts ?? 0,
      version: `${settings.updatedAt?.getTime() ?? 0}`,
    });
  }

  return configs;
}

export async function mailboxConfig(settingsId: Types.ObjectId): Promise<MailboxConfig | null> {
  return (
    (await enabledMailboxes()).find((config) => String(config.settingsId) === String(settingsId)) ??
    null
  );
}

export async function recordMailboxProgress(
  settingsId: Types.ObjectId,
  patch: Partial<{
    lastUid: number;
    retryUid: number | null;
    retryAttempts: number;
    lastCheckedAt: Date;
    lastError: string | null;
  }>,
): Promise<void> {
  const set: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(patch)) set[`inbound.${field}`] = value;
  // updateOne, not save: the worker's bookkeeping must not bump updatedAt, which would make it
  // think the settings changed and reconnect after every message.
  await EmailSettingsModel.updateOne({ _id: settingsId }, { $set: set }, { timestamps: false });
}

/* ------------------------------------------------------------------------------------------------
 * Tests from the Setup screen. These talk to the servers directly, so a mistake shows at once.
 * ---------------------------------------------------------------------------------------------- */

export async function testMailboxConnection(): Promise<string> {
  const settings = await settingsDocument();
  const inbound = settings.inbound!;
  if (!inbound.host || !inbound.username)
    throw new Error('Save the mailbox server and username first.');

  const client = new ImapFlow({
    host: inbound.host,
    port: inbound.port ?? 993,
    secure: inbound.secure ?? true,
    auth: { user: inbound.username, pass: openSecret(inbound.passwordSealed) ?? '' },
    logger: false,
  });

  try {
    await client.connect();
    const status = await client.status('INBOX', { messages: true, unseen: true });
    return `Connected. The inbox holds ${status.messages ?? 0} message(s), ${status.unseen ?? 0} unread. Only mail arriving after intake starts becomes a ticket.`;
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function sendTestEmail(): Promise<string> {
  const settings = await settingsDocument();
  const outbound = settings.outbound!;
  if (!outbound.host || !outbound.fromAddress)
    throw new Error('Save the SMTP server and From address first.');

  const context = getContext();
  const user = await UserModel.findOne({ _id: context.userId, tenantId: context.tenantId }).select(
    'email',
  );
  if (!user?.email) throw new Error('Your user has no email address to send the test to.');

  const transport = transportFor(settings);
  try {
    await transport.sendMail({
      from: fromHeader(settings),
      to: user.email,
      subject: 'COEX test email',
      text: 'This is a test from COEX, Setup, Email. If you can read it, sending works.',
    });
    await EmailSettingsModel.updateOne(
      { _id: settings._id },
      { $set: { 'outbound.lastError': null } },
    );
    return `Sent to ${user.email}.`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await EmailSettingsModel.updateOne(
      { _id: settings._id },
      { $set: { 'outbound.lastError': message } },
    );
    throw new Error(`Sending failed: ${message}`);
  } finally {
    transport.close();
  }
}

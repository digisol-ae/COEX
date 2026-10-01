import { randomUUID } from 'node:crypto';
import type { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { toObjectId } from '@/lib/ids';
import { openSecret } from '@/lib/secret-box';
import { getContext, type RequestContext } from '@/lib/tenant-context';
import { TenantModel } from '@/modules/core/models/tenant.model';
import {
  CHANNEL_ACCOUNTS,
  toE164,
  type CanonicalAck,
  type CanonicalInbound,
  type CanonicalOutbound,
  type CanonicalStatus,
  type ChannelAccount,
} from '../canonical';
import { ChannelMessageModel, type ChannelMessage } from '../models/channel-message.model';
import { ChannelSettingsModel } from '../models/channel-settings.model';
import { ProviderNotReadyError, providerFor } from '../providers';
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, verifySignature } from '../signature';
import { channelSettingsDocument } from './channel-settings.service';

/** After this many attempts an outbound message is marked failed and shown to administrators. */
export const MAX_ATTEMPTS = 6;
const LEASE_MS = 2 * 60 * 1000;
const NOT_READY_WAIT_MS = 5 * 60 * 1000;

/** 30s, 1m, 2m, 4m... capped at 30 minutes. */
export function retryDelayMs(attempts: number): number {
  return Math.min(30_000 * 2 ** Math.max(0, attempts - 1), 30 * 60 * 1000);
}

type StoredMessage = ChannelMessage & { _id: Types.ObjectId };

/* ------------------------------------------------------------------------------------------------
 * Authentication of calls from XVERSE (both cases)
 * --------------------------------------------------------------------------------------------- */

export type ChannelAuth =
  | { ok: true; context: RequestContext; provider: string; delivery: string }
  | { ok: false; status: number; error: string };

/**
 * Resolves the tenant from the URL, checks WhatsApp is on and verifies the signature over the raw
 * body. Unknown tenants and bad signatures get the same answer, so the endpoint reveals nothing.
 */
export async function authenticateChannelRequest(
  slug: string,
  headers: Headers,
  body: string,
): Promise<ChannelAuth> {
  const denied = { ok: false as const, status: 401, error: 'Not authorised.' };
  await connectToDatabase();
  const tenant = await TenantModel.findOne({ slug: slug.toLowerCase() }).select('_id').lean();
  if (!tenant) return denied;
  const settings = await ChannelSettingsModel.findOne({ tenantId: tenant._id }).lean();
  const secret = openSecret(settings?.signingSecretSealed);
  if (!settings || !secret) return denied;

  const verified = verifySignature({
    secret,
    timestamp: headers.get(TIMESTAMP_HEADER),
    signature: headers.get(SIGNATURE_HEADER),
    body,
  });
  if (!verified.ok) return { ...denied, error: verified.reason };
  if (!settings.enabled) {
    return { ok: false, status: 403, error: 'WhatsApp is turned off for this tenant.' };
  }
  const actor = settings.actorUserId ?? settings.updatedById;
  if (!actor) return { ok: false, status: 403, error: 'WhatsApp has no responsible user.' };

  return {
    ok: true,
    context: { tenantId: tenant._id, userId: actor, isPlatformAdmin: false },
    provider: settings.provider ?? 'mock',
    delivery: settings.delivery ?? 'push',
  };
}

/* ------------------------------------------------------------------------------------------------
 * Inbound
 * --------------------------------------------------------------------------------------------- */

export interface InboundResult {
  stored: number;
  duplicates: number;
  rejected: { providerMessageId: string; error: string }[];
}

/**
 * Stores incoming messages as they arrived. Turning them into tickets (M6.2) and CRM activity
 * (M6.5) happens afterwards, from `processedAt: null` rows, so a webhook is answered at once and a
 * later failure never loses a message.
 */
export async function storeInbound(messages: CanonicalInbound[]): Promise<InboundResult> {
  const settings = await channelSettingsDocument();
  const { tenantId } = getContext();
  const accountFor = (to: string): ChannelAccount | null =>
    CHANNEL_ACCOUNTS.find((account) => {
      const configured = settings.accounts?.[account];
      return Boolean(configured?.enabled && configured.number === to);
    }) ?? null;

  const result: InboundResult = { stored: 0, duplicates: 0, rejected: [] };
  for (const message of messages) {
    const account = accountFor(message.to);
    if (!account) {
      result.rejected.push({
        providerMessageId: message.providerMessageId,
        error: `${message.to} is not a WhatsApp number turned on in COEX.`,
      });
      continue;
    }
    try {
      await ChannelMessageModel.create({
        tenantId,
        direction: 'in',
        account,
        provider: settings.provider ?? 'mock',
        providerMessageId: message.providerMessageId,
        from: message.from,
        to: message.to,
        profileName: message.profileName ?? null,
        type: message.type,
        text: message.text ?? null,
        media: message.media
          ? {
              url: message.media.url,
              mimeType: message.media.mimeType,
              fileName: message.media.fileName ?? null,
              size: message.media.size ?? null,
            }
          : null,
        replyToProviderMessageId: message.replyToProviderMessageId ?? null,
        sentAt: message.sentAt,
        status: 'received',
        statusAt: new Date(),
      });
      result.stored += 1;
    } catch (error) {
      if ((error as { code?: number }).code === 11000) result.duplicates += 1;
      else throw error;
    }
  }

  if (result.stored) {
    await ChannelSettingsModel.updateOne(
      { _id: settings._id },
      { $set: { lastInboundAt: new Date() } },
    );
  }
  return result;
}

/* ------------------------------------------------------------------------------------------------
 * Delivery receipts
 * --------------------------------------------------------------------------------------------- */

const STATUS_RANK: Record<string, number> = {
  pending: 0,
  sending: 1,
  sent: 2,
  delivered: 3,
  read: 4,
};

/** Receipts can arrive out of order; a message never goes back from read to delivered. */
export function shouldApplyStatus(current: string, next: CanonicalStatus['status']): boolean {
  if (next === 'failed') return current !== 'read' && current !== 'delivered';
  return (STATUS_RANK[next] ?? 0) > (STATUS_RANK[current] ?? -1);
}

export async function applyStatuses(
  updates: CanonicalStatus[],
): Promise<{ updated: number; unknown: number }> {
  const { tenantId } = getContext();
  await connectToDatabase();
  const result = { updated: 0, unknown: 0 };
  for (const update of updates) {
    const filter = update.providerMessageId
      ? { tenantId, direction: 'out' as const, providerMessageId: update.providerMessageId }
      : { tenantId, direction: 'out' as const, _id: toObjectId(update.outboxId!) };
    const message = await ChannelMessageModel.findOne(filter).select('status').lean();
    if (!message) {
      result.unknown += 1;
      continue;
    }
    if (!shouldApplyStatus(message.status, update.status)) continue;
    await ChannelMessageModel.updateOne(
      { _id: message._id },
      {
        $set: {
          status: update.status,
          statusAt: update.at,
          error: update.status === 'failed' ? (update.error ?? 'Failed.') : null,
          leaseUntil: null,
        },
      },
    );
    result.updated += 1;
  }
  return result;
}

/* ------------------------------------------------------------------------------------------------
 * Outbound: the outbox
 * --------------------------------------------------------------------------------------------- */

export interface QueueInput {
  account: ChannelAccount;
  to: string;
  kind: 'text' | 'template' | 'media';
  text?: string | null;
  template?: { name: string; language: string; parameters: string[] } | null;
  media?: { url: string; mimeType: string; fileName?: string | null } | null;
  ticketId?: string | null;
  contactId?: string | null;
}

/** Puts one message in the outbox. Replies (M6.3) and notifications (M6.4) both come through here. */
export async function queueChannelMessage(input: QueueInput): Promise<string> {
  const settings = await channelSettingsDocument();
  const context = getContext();
  const account = settings.accounts?.[input.account];
  if (!settings.enabled || !account?.enabled || !account.number) {
    throw new Error(
      `The ${input.account === 'crm' ? 'CRM' : 'Support'} WhatsApp number is not on.`,
    );
  }
  const to = toE164(input.to);
  if (!to) throw new Error('That is not a valid international number.');
  if (input.kind === 'text' && !input.text?.trim()) throw new Error('Write the message first.');
  if (input.kind === 'template' && !input.template?.name) throw new Error('Choose a template.');
  if (input.kind === 'media' && !input.media?.url) throw new Error('Attach a file first.');

  const type =
    input.kind === 'template'
      ? 'template'
      : input.kind === 'media'
        ? input.media!.mimeType.startsWith('image/')
          ? 'image'
          : input.media!.mimeType.startsWith('video/')
            ? 'video'
            : input.media!.mimeType.startsWith('audio/')
              ? 'audio'
              : 'document'
        : 'text';

  const created = await ChannelMessageModel.create({
    tenantId: context.tenantId,
    direction: 'out',
    account: input.account,
    provider: settings.provider ?? 'mock',
    from: account.number,
    to,
    type,
    text: input.text?.trim() || null,
    template: input.template ?? null,
    media: input.media
      ? {
          url: input.media.url,
          mimeType: input.media.mimeType,
          fileName: input.media.fileName ?? null,
        }
      : null,
    status: 'pending',
    statusAt: new Date(),
    nextAttemptAt: new Date(),
    ticketId: input.ticketId ? toObjectId(input.ticketId) : null,
    contactId: input.contactId ? toObjectId(input.contactId) : null,
    createdById: context.userId,
  });
  return String(created._id);
}

export function toCanonicalOutbound(message: StoredMessage): CanonicalOutbound {
  return {
    id: String(message._id),
    channelAccount: message.account as ChannelAccount,
    to: message.to,
    kind: message.type === 'template' ? 'template' : message.type === 'text' ? 'text' : 'media',
    text: message.text ?? null,
    template: message.template
      ? {
          name: message.template.name ?? '',
          language: message.template.language ?? 'en',
          parameters: message.template.parameters ?? [],
        }
      : null,
    media: message.media?.url
      ? {
          url: message.media.url,
          mimeType: message.media.mimeType ?? 'application/octet-stream',
          fileName: message.media.fileName ?? null,
        }
      : null,
    context: {
      ticketId: message.ticketId ? String(message.ticketId) : null,
      contactId: message.contactId ? String(message.contactId) : null,
    },
  };
}

/** Claims the next due outbound message of a tenant for two minutes, so no message goes twice. */
async function leaseNext(tenantId: Types.ObjectId): Promise<StoredMessage | null> {
  const now = new Date();
  return (await ChannelMessageModel.findOneAndUpdate(
    {
      tenantId,
      direction: 'out',
      attempts: { $lt: MAX_ATTEMPTS },
      $and: [
        {
          $or: [{ status: 'pending' }, { status: 'sending', leaseUntil: { $lt: now } }],
        },
        { $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }] },
      ],
    },
    {
      $set: { status: 'sending', leaseUntil: new Date(now.getTime() + LEASE_MS) },
      $inc: { attempts: 1 },
    },
    { sort: { createdAt: 1 }, new: true },
  ).lean()) as StoredMessage | null;
}

/** A message XVERSE collected but never acknowledged, MAX_ATTEMPTS times, is given up on. */
async function expireAbandoned(tenantId: Types.ObjectId): Promise<void> {
  await ChannelMessageModel.updateMany(
    {
      tenantId,
      direction: 'out',
      status: 'sending',
      leaseUntil: { $lt: new Date() },
      attempts: { $gte: MAX_ATTEMPTS },
    },
    {
      $set: {
        status: 'failed',
        statusAt: new Date(),
        leaseUntil: null,
        error: 'Not acknowledged after several attempts.',
      },
    },
  );
}

async function markFailedAttempt(
  message: StoredMessage,
  error: string,
): Promise<'retry' | 'failed'> {
  const giveUp = message.attempts >= MAX_ATTEMPTS;
  await ChannelMessageModel.updateOne(
    { _id: message._id },
    {
      $set: giveUp
        ? { status: 'failed', statusAt: new Date(), leaseUntil: null, error }
        : {
            status: 'pending',
            leaseUntil: null,
            error,
            nextAttemptAt: new Date(Date.now() + retryDelayMs(message.attempts)),
          },
    },
  );
  return giveUp ? 'failed' : 'retry';
}

/** Case B: XVERSE collects up to `limit` due messages. Each must be acknowledged. */
export async function leaseOutbox(limit = 50): Promise<CanonicalOutbound[]> {
  const { tenantId } = getContext();
  await connectToDatabase();
  await expireAbandoned(tenantId);
  const leased: CanonicalOutbound[] = [];
  for (let i = 0; i < Math.min(Math.max(limit, 1), 100); i += 1) {
    const message = await leaseNext(tenantId);
    if (!message) break;
    leased.push(toCanonicalOutbound(message));
  }
  return leased;
}

export async function acknowledgeOutbox(
  acks: CanonicalAck[],
): Promise<{ acknowledged: number; unknown: number }> {
  const { tenantId } = getContext();
  await connectToDatabase();
  const result = { acknowledged: 0, unknown: 0 };
  for (const ack of acks) {
    const message = (await ChannelMessageModel.findOne({
      _id: toObjectId(ack.id),
      tenantId,
      direction: 'out',
      status: 'sending',
    }).lean()) as StoredMessage | null;
    if (!message) {
      result.unknown += 1;
      continue;
    }
    if (ack.status === 'sent') {
      await ChannelMessageModel.updateOne(
        { _id: message._id },
        {
          $set: {
            status: 'sent',
            statusAt: new Date(),
            providerMessageId: ack.providerMessageId ?? null,
            leaseUntil: null,
            error: null,
          },
        },
      );
    } else {
      await markFailedAttempt(message, ack.error ?? 'XVERSE could not send it.');
    }
    result.acknowledged += 1;
  }
  return result;
}

/**
 * Case A and test mode: the channel worker sends due messages itself, for every tenant whose
 * delivery is push. Runs without a request context; each tenant is handled on its own so one
 * misconfigured tenant cannot hold up the others.
 */
export async function deliverPendingChannelMessages(
  limitPerTenant = 50,
): Promise<{ sent: number; retrying: number; failed: number; waiting: number }> {
  await connectToDatabase();
  const totals = { sent: 0, retrying: 0, failed: 0, waiting: 0 };
  const tenants = await ChannelSettingsModel.find({ enabled: true, delivery: 'push' }).lean();

  for (const settings of tenants) {
    const provider = providerFor(settings.provider);
    let apiKey: string | null = null;
    try {
      apiKey = openSecret(settings.xverse?.apiKeySealed);
    } catch (error) {
      await ChannelSettingsModel.updateOne(
        { _id: settings._id },
        { $set: { lastError: (error as Error).message } },
      );
      continue;
    }
    const config = { baseUrl: settings.xverse?.baseUrl ?? '', apiKey };

    for (let i = 0; i < limitPerTenant; i += 1) {
      const message = await leaseNext(settings.tenantId);
      if (!message) break;
      try {
        const { providerMessageId } = await provider.send(toCanonicalOutbound(message), config);
        await ChannelMessageModel.updateOne(
          { _id: message._id },
          {
            $set: {
              status: 'sent',
              statusAt: new Date(),
              providerMessageId,
              leaseUntil: null,
              error: null,
            },
          },
        );
        totals.sent += 1;
      } catch (error) {
        const text = error instanceof Error ? error.message : String(error);
        if (error instanceof ProviderNotReadyError) {
          // Not the message's fault: give the attempt back and wait for the connector.
          await ChannelMessageModel.updateOne(
            { _id: message._id },
            {
              $set: {
                status: 'pending',
                leaseUntil: null,
                error: text,
                nextAttemptAt: new Date(Date.now() + NOT_READY_WAIT_MS),
              },
              $inc: { attempts: -1 },
            },
          );
          await ChannelSettingsModel.updateOne(
            { _id: settings._id },
            { $set: { lastError: text } },
          );
          totals.waiting += 1;
          break;
        }
        const outcome = await markFailedAttempt(message, text);
        if (outcome === 'failed') totals.failed += 1;
        else totals.retrying += 1;
      }
    }
  }
  return totals;
}

/* ------------------------------------------------------------------------------------------------
 * For the Setup page
 * --------------------------------------------------------------------------------------------- */

export interface ChannelMessageRow {
  id: string;
  direction: 'in' | 'out';
  account: ChannelAccount;
  from: string;
  to: string;
  profileName: string | null;
  type: string;
  text: string | null;
  status: string;
  error: string | null;
  createdAt: Date;
}

export async function recentChannelMessages(limit = 15): Promise<ChannelMessageRow[]> {
  const { tenantId } = getContext();
  await connectToDatabase();
  const rows = await ChannelMessageModel.find({ tenantId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return rows.map((row) => ({
    id: String(row._id),
    direction: row.direction as 'in' | 'out',
    account: row.account as ChannelAccount,
    from: row.from,
    to: row.to,
    profileName: row.profileName ?? null,
    type: row.type,
    text: row.text ?? (row.template?.name ? `Template: ${row.template.name}` : null),
    status: row.status,
    error: row.error ?? null,
    createdAt: (row as { createdAt?: Date }).createdAt ?? new Date(),
  }));
}

/** Test mode only: behaves exactly as if XVERSE had delivered a message from `from`. */
export async function simulateInbound(input: {
  account: ChannelAccount;
  from: string;
  text: string;
}): Promise<InboundResult> {
  const settings = await channelSettingsDocument();
  if (settings.provider !== 'mock') throw new Error('Simulation is available in test mode only.');
  const to = settings.accounts?.[input.account]?.number;
  if (!to) throw new Error('Set that WhatsApp number first.');
  const from = toE164(input.from);
  if (!from) throw new Error('Enter the sender as an international number, e.g. +971501234567.');
  if (!input.text.trim()) throw new Error('Write the message first.');
  return storeInbound([
    {
      providerMessageId: `sim-${randomUUID()}`,
      to,
      from,
      profileName: 'Test sender',
      sentAt: new Date(),
      type: 'text',
      text: input.text.trim(),
      media: null,
      replyToProviderMessageId: null,
    },
  ]);
}

import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { toObjectId } from '@/lib/ids';
import { openSecret, sealSecret } from '@/lib/secret-box';
import { recordAudit } from '@/modules/core/services/audit.service';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { toE164 } from '@coex/shared/channels/canonical';
import { ChannelMessageModel } from '@coex/shared/channels/models/channel-message.model';
import { ChannelSettingsModel } from '@coex/shared/channels/models/channel-settings.model';
import { newSigningSecret } from '../signature';

export type ChannelProviderName = 'mock' | 'xverse';
export type ChannelDelivery = 'push' | 'pull';

export interface ChannelNotifications {
  ticketReceived: true;
  assigned: boolean;
  awaitingReply: boolean;
  resolved: boolean;
  closed: boolean;
}

export interface ChannelSettingsView {
  tenantSlug: string;
  enabled: boolean;
  provider: ChannelProviderName;
  delivery: ChannelDelivery;
  xverseBaseUrl: string;
  hasApiKey: boolean;
  hasSigningSecret: boolean;
  support: { enabled: boolean; number: string; queueId: string | null };
  crm: { enabled: boolean; number: string };
  notifications: ChannelNotifications;
  lastInboundAt: Date | null;
  lastError: string | null;
  pendingCount: number;
  failedCount: number;
}

export interface ChannelSettingsInput {
  enabled: boolean;
  provider: ChannelProviderName;
  delivery: ChannelDelivery;
  xverseBaseUrl: string;
  /** Blank keeps the stored key. */
  xverseApiKey: string;
  support: { enabled: boolean; number: string; queueId: string | null };
  crm: { enabled: boolean; number: string };
  notifications: Omit<ChannelNotifications, 'ticketReceived'>;
}

export async function channelSettingsDocument() {
  const { tenantId } = getContext();
  await connectToDatabase();
  return (
    (await ChannelSettingsModel.findOne({ tenantId })) ??
    (await ChannelSettingsModel.create({ tenantId }))
  );
}

export async function getChannelSettings(): Promise<ChannelSettingsView> {
  const settings = await channelSettingsDocument();
  const { tenantId } = getContext();
  const [tenant, pendingCount, failedCount] = await Promise.all([
    TenantModel.findById(tenantId).select('slug').lean(),
    ChannelMessageModel.countDocuments({
      tenantId,
      direction: 'out',
      status: { $in: ['pending', 'sending'] },
    }),
    ChannelMessageModel.countDocuments({ tenantId, direction: 'out', status: 'failed' }),
  ]);
  const support = settings.accounts?.support;
  const crm = settings.accounts?.crm;
  const notifications = settings.notifications;

  return {
    tenantSlug: tenant?.slug ?? '',
    enabled: settings.enabled ?? false,
    provider: settings.provider === 'xverse' ? 'xverse' : 'mock',
    delivery: settings.delivery === 'pull' ? 'pull' : 'push',
    xverseBaseUrl: settings.xverse?.baseUrl ?? '',
    hasApiKey: Boolean(settings.xverse?.apiKeySealed),
    hasSigningSecret: Boolean(settings.signingSecretSealed),
    support: {
      enabled: support?.enabled ?? false,
      number: support?.number ?? '',
      queueId: support?.queueId ? String(support.queueId) : null,
    },
    crm: { enabled: crm?.enabled ?? false, number: crm?.number ?? '' },
    notifications: {
      ticketReceived: true,
      assigned: notifications?.assigned ?? false,
      awaitingReply: notifications?.awaitingReply ?? false,
      resolved: notifications?.resolved ?? false,
      closed: notifications?.closed ?? false,
    },
    lastInboundAt: settings.lastInboundAt ?? null,
    lastError: settings.lastError ?? null,
    pendingCount,
    failedCount,
  };
}

function number(label: string, value: string, required: boolean): string {
  if (!value.trim()) {
    if (required) throw new Error(`Enter the ${label} WhatsApp number.`);
    return '';
  }
  const e164 = toE164(value);
  if (!e164) throw new Error(`The ${label} number is not a valid international number.`);
  return e164;
}

export async function saveChannelSettings(input: ChannelSettingsInput): Promise<void> {
  const settings = await channelSettingsDocument();
  const context = getContext();

  const supportNumber = number('Support', input.support.number, input.support.enabled);
  const crmNumber = number('CRM', input.crm.number, input.crm.enabled);
  if (supportNumber && supportNumber === crmNumber) {
    throw new Error('Support and CRM must use two different WhatsApp numbers.');
  }
  if (input.support.enabled && !input.support.queueId) {
    throw new Error('Choose the queue new WhatsApp tickets go to.');
  }

  const baseUrl = input.xverseBaseUrl.trim().replace(/\/+$/, '');
  if (baseUrl && !/^https:\/\/[^\s]+$/i.test(baseUrl)) {
    throw new Error('The XVERSE address must start with https://');
  }
  const apiKeySealed = input.xverseApiKey.trim()
    ? sealSecret(input.xverseApiKey.trim())
    : (settings.xverse?.apiKeySealed ?? null);

  if (input.enabled) {
    if (!input.support.enabled && !input.crm.enabled) {
      throw new Error('Turn on at least one number before turning WhatsApp on.');
    }
    if (!settings.signingSecretSealed) {
      throw new Error('Generate the signing secret before turning WhatsApp on.');
    }
    if (input.provider === 'xverse' && input.delivery === 'push' && (!baseUrl || !apiKeySealed)) {
      throw new Error('Sending through the XVERSE API needs its address and API key.');
    }
  }

  const turnedOn = input.enabled && !settings.enabled;
  settings.enabled = input.enabled;
  settings.provider = input.provider;
  settings.delivery = input.delivery;
  settings.set('xverse', { baseUrl, apiKeySealed });
  settings.set('accounts', {
    support: {
      enabled: input.support.enabled,
      number: supportNumber,
      queueId: input.support.queueId ? toObjectId(input.support.queueId) : null,
    },
    crm: { enabled: input.crm.enabled, number: crmNumber, queueId: null },
  });
  settings.set('notifications', { ticketReceived: true, ...input.notifications });
  if (turnedOn || !settings.actorUserId) settings.actorUserId = context.userId;
  settings.lastError = null;
  settings.updatedById = context.userId;
  await settings.save();

  // Settings, never secrets, go to the audit log.
  await recordAudit({
    action: 'channels.settings.updated',
    entityType: 'ChannelSettings',
    entityId: settings._id,
    after: {
      enabled: input.enabled,
      provider: input.provider,
      delivery: input.delivery,
      xverseBaseUrl: baseUrl || null,
      support: { enabled: input.support.enabled, number: supportNumber || null },
      crm: { enabled: input.crm.enabled, number: crmNumber || null },
      notifications: { ticketReceived: true, ...input.notifications },
    },
  });
}

/** Creates a new signing secret, returned once to be copied into XVERSE, and stored sealed. */
export async function rotateSigningSecret(): Promise<string> {
  const settings = await channelSettingsDocument();
  const secret = newSigningSecret();
  settings.signingSecretSealed = sealSecret(secret);
  settings.updatedById = getContext().userId;
  await settings.save();
  await recordAudit({
    action: 'channels.secret.rotated',
    entityType: 'ChannelSettings',
    entityId: settings._id,
  });
  return secret;
}

export function openChannelSecret(sealed: string | null | undefined): string | null {
  return openSecret(sealed);
}

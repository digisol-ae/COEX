import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * One tenant's WhatsApp channel configuration (M6). Two numbers (John, 1 Oct 2026): Support, whose
 * messages become tickets, and CRM, whose messages become conversations on the contact.
 *
 * `provider` is `mock` (test mode, nothing leaves COEX) or `xverse`. `delivery` settles which side
 * holds the connector: `push` means COEX calls XVERSE's send API (Case A), `pull` means XVERSE
 * collects from the COEX outbox (Case B). Secrets are sealed (lib/secret-box) and never sent to a
 * browser.
 */
const accountSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    /** E.164, the WhatsApp number customers write to. */
    number: { type: String, default: '' },
    /** Support only: the queue new WhatsApp tickets land in. */
    queueId: { type: Schema.Types.ObjectId, ref: 'Queue', default: null },
  },
  { _id: false },
);

const channelSettingsSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
    enabled: { type: Boolean, default: false },
    provider: { type: String, enum: ['mock', 'xverse'], default: 'mock' },
    delivery: { type: String, enum: ['push', 'pull'], default: 'push' },
    xverse: {
      baseUrl: { type: String, default: '' },
      apiKeySealed: { type: String, default: null },
    },
    signingSecretSealed: { type: String, default: null },
    accounts: {
      support: { type: accountSchema, default: () => ({}) },
      crm: { type: accountSchema, default: () => ({}) },
    },
    /** Ticket received is always sent (John, 1 Oct 2026); the rest are optional. */
    notifications: {
      ticketReceived: { type: Boolean, default: true },
      assigned: { type: Boolean, default: false },
      awaitingReply: { type: Boolean, default: false },
      resolved: { type: Boolean, default: false },
      closed: { type: Boolean, default: false },
    },
    /** Recorded as the actor for work done on webhook calls: the administrator who turned it on. */
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    lastInboundAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    updatedById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

export type ChannelSettings = InferSchemaType<typeof channelSettingsSchema>;
export const ChannelSettingsModel: Model<ChannelSettings> =
  (models.ChannelSettings as Model<ChannelSettings>) ??
  model<ChannelSettings>('ChannelSettings', channelSettingsSchema);

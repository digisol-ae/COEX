import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { CHANNEL_ACCOUNTS, MESSAGE_TYPES } from '../canonical';

/**
 * Every WhatsApp message in either direction, in canonical form. Outbound rows are also the outbox:
 * `pending` rows are delivered by the channel worker (push) or collected by XVERSE (pull).
 *
 * Inbound rows are stored first and turned into tickets or CRM activity afterwards (`processedAt`),
 * so a message is never lost because a later step failed, and a webhook is answered quickly.
 */
const channelMessageSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    direction: { type: String, enum: ['in', 'out'], required: true },
    account: { type: String, enum: CHANNEL_ACCOUNTS, required: true },
    provider: { type: String, required: true },
    providerMessageId: { type: String, default: null },
    from: { type: String, required: true },
    to: { type: String, required: true },
    profileName: { type: String, default: null },
    type: { type: String, enum: [...MESSAGE_TYPES, 'template'], required: true },
    text: { type: String, default: null },
    media: {
      type: new Schema(
        { url: String, mimeType: String, fileName: String, size: Number },
        { _id: false },
      ),
      default: null,
    },
    template: {
      type: new Schema(
        { name: String, language: String, parameters: { type: [String], default: [] } },
        { _id: false },
      ),
      default: null,
    },
    replyToProviderMessageId: { type: String, default: null },
    sentAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['received', 'pending', 'sending', 'sent', 'delivered', 'read', 'failed'],
      required: true,
    },
    statusAt: { type: Date, default: null },
    error: { type: String, default: null },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: null },
    leaseUntil: { type: Date, default: null },
    ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', default: null },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', default: null },
    processedAt: { type: Date, default: null },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

// A provider may deliver the same webhook twice; the second copy must be a no-op.
channelMessageSchema.index(
  { tenantId: 1, direction: 1, providerMessageId: 1 },
  { unique: true, partialFilterExpression: { providerMessageId: { $type: 'string' } } },
);
channelMessageSchema.index({ direction: 1, status: 1, nextAttemptAt: 1 });
channelMessageSchema.index({ tenantId: 1, createdAt: -1 });

export type ChannelMessage = InferSchemaType<typeof channelMessageSchema>;
export const ChannelMessageModel: Model<ChannelMessage> =
  (models.ChannelMessage as Model<ChannelMessage>) ??
  model<ChannelMessage>('ChannelMessage', channelMessageSchema);

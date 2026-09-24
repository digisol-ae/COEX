import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * Email waiting to be sent.
 *
 * Nothing in a request sends mail directly. A slow or unavailable SMTP server must not make saving
 * a reply fail, and a failed send must be retried rather than lost, so requests write here and the
 * email worker delivers.
 */
const emailOutboxSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    kind: {
      type: String,
      enum: [
        'auto_reply',
        'ticket_reply',
        'ticket_assigned',
        'customer_replied',
        'task_assigned',
        'test',
      ],
      required: true,
    },
    to: { type: String, required: true, lowercase: true, trim: true },
    subject: { type: String, required: true },
    text: { type: String, required: true },
    /** Our own Message-ID, chosen up front so a customer's answer threads back to the ticket. */
    messageId: { type: String, default: null },
    inReplyTo: { type: String, default: null },
    references: { type: [String], default: [] },
    /** A public ticket reply: its files are added once stored, and read at send time. */
    ticketMessageId: { type: Schema.Types.ObjectId, ref: 'TicketMessage', default: null },
    attachments: {
      type: [
        {
          fileName: { type: String, required: true },
          contentType: { type: String, required: true },
          storageKey: { type: String, required: true },
        },
      ],
      default: [],
    },

    status: {
      type: String,
      enum: ['pending', 'sending', 'sent', 'failed'],
      default: 'pending',
      index: true,
    },
    sendAfter: { type: Date, default: Date.now, index: true },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: null },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

emailOutboxSchema.index({ status: 1, sendAfter: 1 });
emailOutboxSchema.index({ tenantId: 1, kind: 1, to: 1, createdAt: -1 });

export type EmailOutbox = InferSchemaType<typeof emailOutboxSchema>;

export const EmailOutboxModel: Model<EmailOutbox> =
  (models.EmailOutbox as Model<EmailOutbox>) ??
  model<EmailOutbox>('EmailOutbox', emailOutboxSchema);

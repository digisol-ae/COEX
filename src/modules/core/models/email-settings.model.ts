import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * One tenant's email configuration: the support mailbox COEX reads, the SMTP account it sends
 * from, what customers receive automatically, and which alerts staff get.
 *
 * Passwords are stored sealed (see lib/secret-box) and never sent to a browser.
 */
const emailSettingsSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },

    inbound: {
      enabled: { type: Boolean, default: false },
      host: { type: String, default: '' },
      port: { type: Number, default: 993 },
      secure: { type: Boolean, default: true },
      username: { type: String, default: '' },
      passwordSealed: { type: String, default: null },
      /** New email tickets land here. */
      queueId: { type: Schema.Types.ObjectId, ref: 'Queue', default: null },
      /** Recorded as the creator of email tickets: the administrator who turned intake on. */
      actorUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      /**
       * Highest mailbox UID already handled. null means "not started": the worker then records the
       * mailbox's current highest UID first, so mail already sitting in the inbox is never turned
       * into tickets by accident.
       */
      lastUid: { type: Number, default: null },
      /** A message that keeps failing is retried a few times, then skipped so it cannot block the rest. */
      retryUid: { type: Number, default: null },
      retryAttempts: { type: Number, default: 0 },
      lastCheckedAt: { type: Date, default: null },
      lastError: { type: String, default: null },
    },

    outbound: {
      enabled: { type: Boolean, default: false },
      host: { type: String, default: '' },
      port: { type: Number, default: 465 },
      secure: { type: Boolean, default: true },
      username: { type: String, default: '' },
      passwordSealed: { type: String, default: null },
      fromName: { type: String, default: '' },
      fromAddress: { type: String, default: '' },
      lastError: { type: String, default: null },
    },

    customer: {
      autoReplyEnabled: { type: Boolean, default: false },
      autoReplyBody: {
        type: String,
        default:
          'Dear {customer},\n\nThank you for contacting us. Your request has been logged as ticket {ticket} and our support team will respond shortly.\n\nPlease keep the ticket number in the subject line when replying.',
      },
      emailPublicReplies: { type: Boolean, default: true },
    },

    staff: {
      ticketAssigned: { type: Boolean, default: true },
      customerReplied: { type: Boolean, default: true },
      taskAssigned: { type: Boolean, default: true },
      mentioned: { type: Boolean, default: true },
    },

    updatedById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

export type EmailSettings = InferSchemaType<typeof emailSettingsSchema>;

export const EmailSettingsModel: Model<EmailSettings> =
  (models.EmailSettings as Model<EmailSettings>) ??
  model<EmailSettings>('EmailSettings', emailSettingsSchema);

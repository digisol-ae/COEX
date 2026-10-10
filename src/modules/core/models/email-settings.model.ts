import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * One tenant's email configuration: the support mailbox COEX reads, the SMTP account it sends
 * from, what customers receive automatically, and which alerts staff get.
 *
 * Passwords are stored sealed (see lib/secret-box) and never sent to a browser.
 */
/**
 * An extra sending identity (John, 28 Sep 2026): Alert for staff alerts, Admin for account mail.
 * Blank means "send from the standard account", so nothing changes until one is set up. It can
 * reuse the standard account's connection with its own From (the mailbox must allow "Send As"),
 * or sign in with an account of its own.
 */
const senderSchema = new Schema(
  {
    fromName: { type: String, default: '' },
    fromAddress: { type: String, default: '' },
    ownAccount: { type: Boolean, default: false },
    host: { type: String, default: '' },
    port: { type: Number, default: 465 },
    secure: { type: Boolean, default: true },
    username: { type: String, default: '' },
    passwordSealed: { type: String, default: null },
    lastError: { type: String, default: null },
  },
  { _id: false },
);

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

    senders: {
      alert: { type: senderSchema, default: () => ({}) },
      admin: { type: senderSchema, default: () => ({}) },
      contracts: { type: senderSchema, default: () => ({}) },
    },

    /**
     * Emails staff send to a customer about a contract (John, 4 Oct 2026). Placeholders are single
     * braced, like the acknowledgement: {customer} {contact} {contract_title} {contract_number}
     * {start_date} {end_date} {days_left} {amount} {billing} {company}.
     */
    contractTemplates: {
      renewal: {
        subject: {
          type: String,
          default: 'Your {contract_title} contract ends on {end_date}',
        },
        body: {
          type: String,
          default:
            'Dear {contact},\n\nThis is a reminder that your {contract_title} agreement ({contract_number}) with us ends on {end_date}, in {days_left} days.\n\nTo keep your support and maintenance running without a break, please let us know that you would like to renew and we will prepare the renewal for you.\n\nKind regards,\n{company}',
        },
      },
      expired: {
        subject: { type: String, default: 'Your {contract_title} contract has ended' },
        body: {
          type: String,
          default:
            'Dear {contact},\n\nYour {contract_title} agreement ({contract_number}) ended on {end_date}. To restore your support and maintenance cover, please reply to this email and we will arrange the renewal.\n\nKind regards,\n{company}',
        },
      },
      general: {
        subject: { type: String, default: 'About your {contract_title} contract' },
        body: { type: String, default: 'Dear {contact},\n\n\n\nKind regards,\n{company}' },
      },
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
      contractRenewal: { type: Boolean, default: true },
      /** Who hears about a new ticket: nobody, administrators, or everyone who works the desk. */
      ticketCreated: { type: String, enum: ['off', 'admins', 'desk'], default: 'admins' },
    },

    /**
     * The daily performance email (John, 10 Oct 2026). Off until someone turns it on in Setup,
     * Email, so deploying never starts mailing agents by surprise. `lastSentFor` is the working day
     * already reported on; the worker claims it atomically so a restart never repeats a day.
     */
    dailyReport: {
      enabled: { type: Boolean, default: false },
      minimumHours: { type: Number, default: 6 },
      summaryRecipients: { type: [String], default: [] },
      lastSentFor: { type: String, default: null },
    },

    updatedById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

export type EmailSettings = InferSchemaType<typeof emailSettingsSchema>;

export const EmailSettingsModel: Model<EmailSettings> =
  (models.EmailSettings as Model<EmailSettings>) ??
  model<EmailSettings>('EmailSettings', emailSettingsSchema);

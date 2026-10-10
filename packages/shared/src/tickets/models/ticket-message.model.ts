import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * One message on a ticket.
 *
 * visibility is the field that matters most in the whole module. A public reply reaches the
 * customer; an internal note never does. Getting this wrong once, in front of a client, costs more
 * than every other bug in this system put together, so it is required, has no default that could
 * be assumed, and the two are never rendered alike.
 */

const attachmentSchema = new Schema(
  {
    fileName: { type: String, required: true },
    contentType: { type: String, required: true },
    /** Key in object storage. The file itself never sits in MongoDB. */
    storageKey: { type: String, required: true },
    bytes: { type: Number, required: true },
    originalBytes: { type: Number, default: null },
    processedAt: { type: Date, default: null },
  },
  { _id: true },
);

const ticketMessageSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },

    visibility: { type: String, enum: ['public', 'internal'], required: true, index: true },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },

    body: { type: String, required: true },

    /** One of the two is set: a member of staff, or a customer contact. */
    authorUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    authorContactId: { type: Schema.Types.ObjectId, ref: 'Contact', default: null },
    authorName: { type: String, required: true },

    channel: {
      type: String,
      enum: ['agent', 'portal', 'email', 'whatsapp', 'system'],
      default: 'agent',
    },

    attachments: { type: [attachmentSchema], default: [] },

    /** Message identifiers from email, used to thread replies back onto the right ticket. */
    externalMessageId: { type: String, default: null, index: true, sparse: true },

    sentAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

ticketMessageSchema.index({ tenantId: 1, ticketId: 1, sentAt: 1 });

export type TicketMessage = InferSchemaType<typeof ticketMessageSchema>;

export const TicketMessageModel: Model<TicketMessage> =
  (models.TicketMessage as Model<TicketMessage>) ??
  model<TicketMessage>('TicketMessage', ticketMessageSchema);

import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * A support ticket.
 *
 * The conversation lives in its own collection rather than embedded, because a long running ticket
 * with forty replies and attachments would otherwise push the document towards MongoDB's limit and
 * make every list query carry text nobody is reading.
 *
 * Reopening is deliberate: from Resolved it reopens in place, but from Closed it creates a linked
 * follow up ticket instead. Otherwise a ticket closed in March can be reopened in December and the
 * resolution figures for March quietly change.
 */

const ticketSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

    number: { type: String, required: true },
    subject: { type: String, required: true, trim: true },

    queueId: { type: Schema.Types.ObjectId, ref: 'Queue', required: true, index: true },

    status: {
      type: String,
      enum: ['new', 'open', 'pending_customer', 'escalated', 'resolved', 'closed'],
      default: 'new',
      index: true,
    },
    priority: {
      type: String,
      enum: ['urgent', 'high', 'normal', 'low'],
      default: 'normal',
      index: true,
    },

    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      default: null,
      index: true,
    },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', default: null, index: true },
    /** Who emailed us, kept so replies reach them before they are added to the CRM. */
    requesterEmail: { type: String, default: null, lowercase: true, trim: true },
    requesterName: { type: String, default: null },
    locationId: { type: Schema.Types.ObjectId, ref: 'Location', default: null },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },

    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    watcherIds: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },

    channel: {
      type: String,
      enum: ['agent', 'portal', 'email', 'whatsapp'],
      default: 'agent',
      index: true,
    },

    /** Service level, computed on creation from the queue targets and the working calendar. */
    firstResponseDueAt: { type: Date, default: null, index: true },
    resolutionDueAt: { type: Date, default: null, index: true },
    firstRespondedAt: { type: Date, default: null },
    firstResponseMinutes: { type: Number, default: null },
    firstResponseBreached: { type: Boolean, default: false, index: true },
    resolutionBreached: { type: Boolean, default: false, index: true },

    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    resolutionMinutes: { type: Number, default: null },

    /** Escalation keeps a two way link with the task it produced. */
    escalatedTaskId: { type: Schema.Types.ObjectId, ref: 'Task', default: null },
    /** Set on the ticket that was merged away, pointing at the survivor. */
    mergedIntoId: { type: Schema.Types.ObjectId, ref: 'Ticket', default: null, index: true },
    /** Set on a follow up created by reopening a closed ticket. */
    followsOnFromId: { type: Schema.Types.ObjectId, ref: 'Ticket', default: null },
    linkedTicketIds: { type: [Schema.Types.ObjectId], ref: 'Ticket', default: [] },

    tags: { type: [String], default: [] },
    customFields: { type: Map, of: Schema.Types.Mixed, default: () => new Map() },

    lastActivityAt: { type: Date, default: Date.now, index: true },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

ticketSchema.index({ tenantId: 1, number: 1 }, { unique: true });
ticketSchema.index({ tenantId: 1, queueId: 1, status: 1 });
ticketSchema.index({ tenantId: 1, assigneeId: 1, status: 1 });
ticketSchema.index({ tenantId: 1, organisationId: 1, createdAt: -1 });

export type Ticket = InferSchemaType<typeof ticketSchema>;

export const TicketModel: Model<Ticket> =
  (models.Ticket as Model<Ticket>) ?? model<Ticket>('Ticket', ticketSchema);

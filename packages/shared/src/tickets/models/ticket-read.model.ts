import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * When one person last opened one ticket.
 *
 * A ticket is unread for someone when the customer has written since then. Kept per person rather
 * than as a flag on the ticket, because the manager glancing at a ticket has not dealt with it on
 * the assignee's behalf, and clearing the assignee's mark for them is how a reply goes unanswered.
 */

const ticketReadSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: { type: Date, required: true },
  },
  { timestamps: false },
);

ticketReadSchema.index({ tenantId: 1, userId: 1, ticketId: 1 }, { unique: true });

export type TicketRead = InferSchemaType<typeof ticketReadSchema>;

export const TicketReadModel: Model<TicketRead> =
  (models.TicketRead as Model<TicketRead>) ?? model<TicketRead>('TicketRead', ticketReadSchema);

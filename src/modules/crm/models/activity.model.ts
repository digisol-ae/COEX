import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * The single timeline.
 *
 * Every interaction with a customer lands here, whoever wrote it: a note typed by an agent, a call
 * logged after the fact, a ticket opened, a task assigned, a WhatsApp message sent through XVERSE.
 * One collection rather than one per module is what lets a client record show its whole history,
 * and it is why the later CRM is a set of screens rather than a second data model.
 *
 * Entries are not edited after the fact except for their note text, and never deleted.
 */

const activitySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      index: true,
    },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', default: null, index: true },
    locationId: { type: Schema.Types.ObjectId, ref: 'Location', default: null },

    kind: {
      type: String,
      enum: [
        'note',
        'call',
        'meeting',
        'email',
        'whatsapp',
        'ticket_opened',
        'ticket_replied',
        'ticket_resolved',
        'task_created',
        'task_completed',
        'document_shared',
      ],
      required: true,
      index: true,
    },

    direction: { type: String, enum: ['inbound', 'outbound', 'internal'], default: 'internal' },

    summary: { type: String, required: true, trim: true },
    body: { type: String, default: null },

    /** Where this came from, so a timeline entry can open the ticket or task that produced it. */
    sourceModule: {
      type: String,
      enum: ['crm', 'tickets', 'tasks', 'xverse', 'email'],
      default: 'crm',
      index: true,
    },
    sourceId: { type: Schema.Types.ObjectId, default: null, index: true },

    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    occurredAt: { type: Date, default: Date.now, index: true },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

activitySchema.index({ tenantId: 1, organisationId: 1, occurredAt: -1 });

export type Activity = InferSchemaType<typeof activitySchema>;

export const ActivityModel: Model<Activity> =
  (models.Activity as Model<Activity>) ?? model<Activity>('Activity', activitySchema);

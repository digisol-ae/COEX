import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * A queue is where tickets land and who is expected to answer them.
 *
 * Service level targets live on the queue rather than globally, because a queue for a hosted
 * product and a queue for onsite hardware cannot promise the same response. Targets are in working
 * minutes and are measured against the tenant's working calendar.
 *
 * Contract driven targets arrive in a later phase; Phase 1 sets them per priority here, with an
 * optional override per customer.
 */

const targetSchema = new Schema(
  {
    priority: { type: String, enum: ['urgent', 'high', 'normal', 'low'], required: true },
    firstResponseMinutes: { type: Number, required: true },
    resolutionMinutes: { type: Number, required: true },
  },
  { _id: false },
);

export const DEFAULT_TARGETS = [
  { priority: 'urgent', firstResponseMinutes: 60, resolutionMinutes: 8 * 60 },
  { priority: 'high', firstResponseMinutes: 4 * 60, resolutionMinutes: 24 * 60 },
  { priority: 'normal', firstResponseMinutes: 8 * 60, resolutionMinutes: 3 * 24 * 60 },
  { priority: 'low', firstResponseMinutes: 24 * 60, resolutionMinutes: 5 * 24 * 60 },
];

const queueSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },

    /** Optional: a queue may serve one product, such as R4+ or XVerse. */
    productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },

    memberIds: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    /** Tickets with no obvious owner go here first. */
    defaultAssigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    /** Replies from this queue carry this signature. */
    signature: { type: String, default: null },

    targets: { type: [targetSchema], default: () => DEFAULT_TARGETS },

    isDefault: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

queueSchema.index({ tenantId: 1, name: 1 });

export type Queue = InferSchemaType<typeof queueSchema>;

export const QueueModel: Model<Queue> =
  (models.Queue as Model<Queue>) ?? model<Queue>('Queue', queueSchema);

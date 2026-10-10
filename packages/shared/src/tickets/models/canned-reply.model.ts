import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * A saved reply an agent can insert and then edit.
 *
 * Placeholders are filled when the reply is inserted rather than stored expanded, so a template
 * corrected today improves every reply sent tomorrow.
 */

const cannedReplySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    queueId: { type: Schema.Types.ObjectId, ref: 'Queue', default: null, index: true },

    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },

    useCount: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

cannedReplySchema.index({ tenantId: 1, title: 1 });

export type CannedReply = InferSchemaType<typeof cannedReplySchema>;

export const CannedReplyModel: Model<CannedReply> =
  (models.CannedReply as Model<CannedReply>) ??
  model<CannedReply>('CannedReply', cannedReplySchema);

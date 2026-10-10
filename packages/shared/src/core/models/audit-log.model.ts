import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * Append only record of every mutation. Nothing updates or deletes an entry, which is what makes
 * it usable as evidence in an ADHICS style review.
 */

const auditLogSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorEmail: { type: String, default: null },

    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: Schema.Types.ObjectId, default: null, index: true },

    /** Only the fields that changed, so the log stays readable and small. */
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },

    ipAddress: { type: String, default: null },
    at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

auditLogSchema.index({ tenantId: 1, at: -1 });

export type AuditLog = InferSchemaType<typeof auditLogSchema>;

export const AuditLogModel: Model<AuditLog> =
  (models.AuditLog as Model<AuditLog>) ?? model<AuditLog>('AuditLog', auditLogSchema);

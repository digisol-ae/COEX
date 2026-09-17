import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * A locked week.
 *
 * Time is the basis of billing and of any claim about where effort went, so past weeks must not
 * change quietly. Locking is manual and by whole week, and an administrator can unlock with a
 * reason, which is recorded.
 */

const weekLockSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    /** Monday of the locked week, at midnight. */
    weekStart: { type: Date, required: true },

    lockedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lockedAt: { type: Date, default: Date.now },

    unlockedById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    unlockedAt: { type: Date, default: null },
    unlockReason: { type: String, default: null },
  },
  { timestamps: true },
);

weekLockSchema.index({ tenantId: 1, weekStart: 1 }, { unique: true });

export type WeekLock = InferSchemaType<typeof weekLockSchema>;

export const WeekLockModel: Model<WeekLock> =
  (models.WeekLock as Model<WeekLock>) ?? model<WeekLock>('WeekLock', weekLockSchema);

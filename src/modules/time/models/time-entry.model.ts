import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * One period of work against one task.
 *
 * minutes is stored rather than computed from the timestamps, because a manual entry has no
 * timestamps worth keeping and because a rounding rule applied at read time would give different
 * answers in different screens.
 *
 * endedAt null with source 'timer' means the timer is still running. Exactly one such entry may
 * exist per person, enforced by a partial unique index.
 */

const timeEntrySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    portfolioId: { type: Schema.Types.ObjectId, ref: 'Portfolio', required: true, index: true },
    /** Copied from the task so time can be reported by customer without a join. */
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      default: null,
      index: true,
    },

    /** The day the work belongs to, at midnight in the tenant timezone. Drives every report. */
    workDate: { type: Date, required: true, index: true },

    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    minutes: { type: Number, default: 0 },

    note: { type: String, default: null },
    billable: { type: Boolean, default: true, index: true },

    source: { type: String, enum: ['timer', 'manual'], default: 'manual' },
    running: { type: Boolean, default: false },

    /** Set when the week is locked. A locked entry cannot be edited or deleted. */
    lockedAt: { type: Date, default: null },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

timeEntrySchema.index({ tenantId: 1, userId: 1, workDate: -1 });
timeEntrySchema.index({ tenantId: 1, taskId: 1 });

/**
 * One running timer per person, enforced by the database rather than by application code, because
 * two browser tabs can otherwise start two timers a millisecond apart.
 */
timeEntrySchema.index(
  { tenantId: 1, userId: 1, running: 1 },
  { unique: true, partialFilterExpression: { running: true } },
);

export type TimeEntry = InferSchemaType<typeof timeEntrySchema>;

export const TimeEntryModel: Model<TimeEntry> =
  (models.TimeEntry as Model<TimeEntry>) ?? model<TimeEntry>('TimeEntry', timeEntrySchema);

import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * The unit of work that is assigned and tracked.
 *
 * Subtasks are embedded rather than a separate collection: one level of breakdown, always loaded
 * with the task, never queried on their own. A subtask that needs subtasks of its own is really a
 * task, and allowing deeper nesting is how a plan becomes impossible to hold in the head.
 *
 * Document links are pointers into Microsoft 365, never copies, because documents belong where the
 * company already keeps them.
 */

const subtaskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    done: { type: Boolean, default: false },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    completedAt: { type: Date, default: null },
  },
  { _id: true },
);

const documentLinkSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    addedById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    addedAt: { type: Date, default: Date.now },
    /** Set once Graph can confirm the viewer may open it. Null means not checked yet. */
    accessCheckedAt: { type: Date, default: null },
  },
  { _id: true },
);

const taskSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

    number: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },

    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    /** One of the project's phases, or nothing. Grouping, not containment. */
    phase: { type: String, default: null, index: true },

    /** Matches one of the project's configured column names. */
    status: { type: String, required: true, index: true },
    priority: {
      type: String,
      enum: ['urgent', 'high', 'normal', 'low'],
      default: 'normal',
      index: true,
    },

    assigneeIds: { type: [Schema.Types.ObjectId], ref: 'User', default: [], index: true },
    primaryAssigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    watcherIds: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },

    /**
     * The planned window, with times rather than dates alone, which is what the Gantt view draws
     * and what planned hours are calculated from.
     *
     * endAt is also the deadline: a task is overdue when it is open and endAt has passed. Keeping
     * a separate due date beside a planned end is how two fields end up disagreeing and nobody
     * knows which one the report used.
     */
    startAt: { type: Date, default: null, index: true },
    endAt: { type: Date, default: null, index: true },

    /**
     * Working minutes between startAt and endAt, stored rather than computed on read so a report
     * cannot disagree with a screen. Working minutes, not elapsed: a task planned from Monday
     * morning to Wednesday evening is three working days, not fifty six hours.
     */
    plannedMinutes: { type: Number, default: null },

    /** The effort someone expects it to take, which is a different question from when it happens. */
    estimateMinutes: { type: Number, default: null },

    /** Position within its board column, so an ordering survives a reload. */
    sortOrder: { type: Number, default: 0 },

    tags: { type: [String], default: [] },
    subtasks: { type: [subtaskSchema], default: [] },
    documentLinks: { type: [documentLinkSchema], default: [] },

    blockedByIds: { type: [Schema.Types.ObjectId], ref: 'Task', default: [] },

    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      default: null,
      index: true,
    },
    /** Set when a support ticket is escalated into a task, keeping the two way link. */
    sourceTicketId: { type: Schema.Types.ObjectId, ref: 'Ticket', default: null, index: true },

    /** Denormalised from the project's column so overdue and open counts stay cheap. */
    isClosed: { type: Boolean, default: false, index: true },
    closedAt: { type: Date, default: null },

    /** Drives the ageing view: anything untouched for more than seven days. */
    lastActivityAt: { type: Date, default: Date.now, index: true },

    createdById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

taskSchema.index({ tenantId: 1, number: 1 }, { unique: true });
taskSchema.index({ tenantId: 1, projectId: 1, status: 1 });
taskSchema.index({ tenantId: 1, isClosed: 1, endAt: 1 });
taskSchema.index({ tenantId: 1, projectId: 1, status: 1, sortOrder: 1 });
taskSchema.index({ tenantId: 1, primaryAssigneeId: 1, isClosed: 1 });

export type Task = InferSchemaType<typeof taskSchema>;

export const TaskModel: Model<Task> =
  (models.Task as Model<Task>) ?? model<Task>('Task', taskSchema);

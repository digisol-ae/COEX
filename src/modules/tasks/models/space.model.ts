import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * A space: the top of the structure.
 *
 * Four levels, and no more. A space holds folders, a folder holds tasks, a task holds subtasks.
 * Anything deeper is a plan nobody can hold in their head, and anything shallower forces unrelated
 * work into one list.
 *
 * Board columns are configured per space rather than globally, because an implementation space and
 * a support backlog do not move through the same stages. Exactly one column carries isClosed,
 * which is how the dashboard knows what counts as finished without guessing from names.
 */

const statusSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    isClosed: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false },
);

export const DEFAULT_STATUSES = [
  { name: 'To do', isClosed: false, sortOrder: 0 },
  { name: 'In progress', isClosed: false, sortOrder: 1 },
  { name: 'Blocked', isClosed: false, sortOrder: 2 },
  { name: 'Done', isClosed: true, sortOrder: 3 },
];

const spaceSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },

    /** Optional link to the customer master, so the work shows on the client timeline. */
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      default: null,
      index: true,
    },

    ownerId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    memberIds: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },

    startDate: { type: Date, default: null },
    dueDate: { type: Date, default: null },

    /** Manual drag order on the Spaces list. Untouched spaces keep the default and sort by name. */
    sortOrder: { type: Number, default: 0, index: true },

    statuses: { type: [statusSchema], default: () => DEFAULT_STATUSES },

    status: {
      type: String,
      enum: ['active', 'completed', 'archived'],
      default: 'active',
      index: true,
    },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

spaceSchema.index({ tenantId: 1, name: 1 });

export type Space = InferSchemaType<typeof spaceSchema>;

export const SpaceModel: Model<Space> =
  (models.Space as Model<Space>) ?? model<Space>('Space', spaceSchema);

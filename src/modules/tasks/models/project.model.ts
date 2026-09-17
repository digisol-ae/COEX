import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * A body of work with a start, an end and an owner.
 *
 * Board columns are configured per project rather than globally, because an implementation project
 * and a support backlog do not move through the same stages. Exactly one column carries isClosed,
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

const projectSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    portfolioId: { type: Schema.Types.ObjectId, ref: 'Portfolio', required: true, index: true },

    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },

    /** Optional link to the customer master, so project work shows on the client timeline. */
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

projectSchema.index({ tenantId: 1, portfolioId: 1, name: 1 });

export type Project = InferSchemaType<typeof projectSchema>;

export const ProjectModel: Model<Project> =
  (models.Project as Model<Project>) ?? model<Project>('Project', projectSchema);

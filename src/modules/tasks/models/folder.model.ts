import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * A folder: the second level, and the only one that controls who can see anything.
 *
 * A folder with no members named on it is open, and everyone who can open the space can see it.
 * Name members on it and it becomes private to them. That is the whole rule, and it is deliberately
 * the only access rule in the task module: an access model people cannot recite is one they will
 * get wrong, and getting it wrong means either a leak or work nobody can find.
 *
 * A private folder is private to its members, not to the assignees of the work inside it. So a task
 * in a private folder can only be given to someone who is in that folder; the service refuses
 * otherwise rather than quietly creating work its owner cannot see.
 */

const folderSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    spaceId: { type: Schema.Types.ObjectId, ref: 'Space', required: true, index: true },

    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },

    /** Empty means open to the whole space. Anyone named here makes it private to those people. */
    memberIds: { type: [Schema.Types.ObjectId], ref: 'User', default: [], index: true },

    sortOrder: { type: Number, default: 0 },

    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

folderSchema.index({ tenantId: 1, spaceId: 1, sortOrder: 1 });

export type Folder = InferSchemaType<typeof folderSchema>;

export const FolderModel: Model<Folder> =
  (models.Folder as Model<Folder>) ?? model<Folder>('Folder', folderSchema);

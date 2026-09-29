import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const deskSnapshotSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  workDate: { type: String, required: true },
  score: { type: Number, required: true },
  completedOnTime: { type: Number, required: true }, overdue: { type: Number, required: true },
  dueTomorrowNotStarted: { type: Number, required: true }, dueSoonInProgress: { type: Number, required: true },
  taskIds: { type: [Schema.Types.ObjectId], ref: 'Task', default: [] },
}, { timestamps: true });
deskSnapshotSchema.index({ tenantId: 1, userId: 1, workDate: 1 }, { unique: true });
export type DeskSnapshot = InferSchemaType<typeof deskSnapshotSchema>;
export const DeskSnapshotModel: Model<DeskSnapshot> = (models.DeskSnapshot as Model<DeskSnapshot>) ?? model<DeskSnapshot>('DeskSnapshot', deskSnapshotSchema);

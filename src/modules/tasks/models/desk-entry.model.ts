import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const deskEntrySchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
}, { timestamps: true });
deskEntrySchema.index({ tenantId: 1, userId: 1, taskId: 1 }, { unique: true });
export type DeskEntry = InferSchemaType<typeof deskEntrySchema>;
export const DeskEntryModel: Model<DeskEntry> = (models.DeskEntry as Model<DeskEntry>) ?? model<DeskEntry>('DeskEntry', deskEntrySchema);

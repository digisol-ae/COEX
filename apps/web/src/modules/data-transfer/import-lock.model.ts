import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
// Transient coordination only; never application records. Serializes imports per tenant/module.
const schema = new Schema({
  _id: { type: String, required: true },
  tenantId: { type: Schema.Types.ObjectId, required: true },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});
type ImportLock = InferSchemaType<typeof schema>;
export const ImportLockModel =
  (models.DataTransferLock as Model<ImportLock> | undefined) ??
  model<ImportLock>('DataTransferLock', schema);

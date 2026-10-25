import { Schema, model, models } from 'mongoose';
const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, unique: true },
  tenantId: { type: Schema.Types.ObjectId, required: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  sentAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  tokenHash: { type: String, default: null },
  verifiedAt: { type: Date, default: null },
  usedAt: { type: Date, default: null },
});
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });
export const ActivationModel = models.Activation ?? model('Activation', schema);

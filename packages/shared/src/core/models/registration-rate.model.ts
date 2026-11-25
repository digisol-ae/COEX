import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
const schema = new Schema(
  {
    _id: { type: String, required: true },
    count: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
type RegistrationRate = InferSchemaType<typeof schema>;
export const RegistrationRateModel: Model<RegistrationRate> =
  (models.RegistrationRate as Model<RegistrationRate>) ??
  model<RegistrationRate>('RegistrationRate', schema);

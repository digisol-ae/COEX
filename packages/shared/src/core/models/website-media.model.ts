import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose';
const schema = new Schema(
  {
    publicId: { type: String, required: true, unique: true },
    storageKey: { type: String, required: true },
    tenantId: { type: Schema.Types.ObjectId, required: true },
    actorId: { type: Schema.Types.ObjectId, required: true },
    bytes: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { timestamps: true },
);
export const WebsiteMediaModel =
  (models.WebsiteMedia as Model<InferSchemaType<typeof schema>>) || model('WebsiteMedia', schema);

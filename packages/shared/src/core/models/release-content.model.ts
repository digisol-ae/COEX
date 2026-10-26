import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const section = new Schema({ heading: String, items: [String] }, { _id: false });
const release = new Schema(
  { id: String, date: String, title: String, sections: [section] },
  { _id: false },
);
const entry = new Schema(
  {
    draft: { type: release, required: true },
    published: { type: release, default: null },
    revision: { type: String, required: true },
  },
  { _id: false },
);
const schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, unique: true },
    version: { type: Number, required: true },
    entries: [entry],
  },
  { timestamps: true },
);
type ReleaseContent = InferSchemaType<typeof schema>;
export const ReleaseContentModel: Model<ReleaseContent> =
  (models.ReleaseContent as Model<ReleaseContent>) ??
  model<ReleaseContent>('ReleaseContent', schema);

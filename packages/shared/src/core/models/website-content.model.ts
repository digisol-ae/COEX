import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose';
const schema = new Schema(
  {
    key: { type: String, unique: true, required: true },
    revision: { type: Number, required: true },
    draft: { type: Schema.Types.Mixed, required: true },
    published: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true, minimize: false },
);
export const WebsiteContentModel =
  (models.WebsiteContent as Model<InferSchemaType<typeof schema>>) ||
  model('WebsiteContent', schema);
const versionSchema = new Schema(
  {
    revision: { type: Number, required: true, unique: true },
    content: { type: Schema.Types.Mixed, required: true },
    operation: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true, minimize: false },
);
export const WebsiteVersionModel =
  (models.WebsiteVersion as Model<InferSchemaType<typeof versionSchema>>) ||
  model('WebsiteVersion', versionSchema);

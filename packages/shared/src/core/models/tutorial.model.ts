import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
const schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, unique: true },
    title: { type: String, required: true },
    fileKey: { type: String, default: null },
    contentType: { type: String, default: null },
    videoUrl: { type: String, default: null },
    revision: { type: String, required: true },
    active: { type: Boolean, default: false },
  },
  { timestamps: true },
);
type Tutorial = InferSchemaType<typeof schema>;
export const TutorialModel: Model<Tutorial> =
  (models.Tutorial as Model<Tutorial>) ?? model<Tutorial>('Tutorial', schema);
const seenSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    revision: { type: String, required: true },
  },
  { timestamps: true },
);
seenSchema.index({ tenantId: 1, userId: 1, revision: 1 }, { unique: true });
type TutorialSeen = InferSchemaType<typeof seenSchema>;
export const TutorialSeenModel: Model<TutorialSeen> =
  (models.TutorialSeen as Model<TutorialSeen>) ?? model<TutorialSeen>('TutorialSeen', seenSchema);

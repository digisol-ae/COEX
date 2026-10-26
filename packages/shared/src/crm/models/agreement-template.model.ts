import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
const schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['amc', 'subscription', 'project'], required: true },
    body: { type: String, required: true },
    reviewNotes: { type: String, default: '' },
    revision: { type: Number, default: 1 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
type AgreementTemplateRecord = InferSchemaType<typeof schema>;
export const AgreementTemplateModel: Model<AgreementTemplateRecord> =
  (models.AgreementTemplate as Model<AgreementTemplateRecord>) ??
  model('AgreementTemplate', schema);

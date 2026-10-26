import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
const schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    contractId: { type: Schema.Types.ObjectId, ref: 'Contract', required: true },
    templateId: { type: String, required: true },
    templateName: { type: String, required: true },
    templateRevision: { type: Number, required: true },
    /** Snapshot: later template/customer changes never silently rewrite an agreement. */
    body: { type: String, required: true },
    reviewNotes: { type: String, default: '' },
    reviewed: { type: Boolean, default: false },
    revision: { type: Number, default: 1 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
schema.index({ tenantId: 1, contractId: 1 }, { unique: true });
type AgreementDraft = InferSchemaType<typeof schema>;
export const AgreementDraftModel: Model<AgreementDraft> =
  (models.AgreementDraft as Model<AgreementDraft>) ?? model('AgreementDraft', schema);

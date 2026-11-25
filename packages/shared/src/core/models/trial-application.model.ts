import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/** Platform-owned intake. No tenant or login account exists before approval. */
const schema = new Schema(
  {
    companyName: { type: String, required: true, maxlength: 200 },
    slug: { type: String, required: true, maxlength: 40 },
    adminName: { type: String, required: true, maxlength: 200 },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    status: {
      type: String,
      enum: ['unverified', 'pending', 'approved', 'rejected'],
      default: 'unverified',
      index: true,
    },
    verificationTokenHash: { type: String, required: true, select: false, index: true },
    verificationExpiresAt: { type: Date, required: true },
    verifiedAt: { type: Date, default: null },
    lastIssuedAt: { type: Date, required: true },
    reviewedAt: { type: Date, default: null },
    reviewedById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewNote: { type: String, default: '', maxlength: 500 },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    activationTokenHash: { type: String, default: null, select: false, index: true },
    activationExpiresAt: { type: Date, default: null },
    activatedAt: { type: Date, default: null },
    // Only abandoned unverified intake expires automatically, never approved customer records.
    purgeAt: { type: Date, default: null },
  },
  { timestamps: true },
);
schema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
export type TrialApplication = InferSchemaType<typeof schema>;
export const TrialApplicationModel: Model<TrialApplication> =
  (models.TrialApplication as Model<TrialApplication>) ??
  model<TrialApplication>('TrialApplication', schema);

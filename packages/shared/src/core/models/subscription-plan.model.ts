import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/** Published versions are immutable. Archive stops new assignment; existing snapshots survive. */
const termsDefinition = {
  modules: {
    tasks: { type: Boolean, default: true },
    tickets: { type: Boolean, default: true },
    crm: { type: Boolean, default: true },
    payroll: { type: Boolean, default: false },
  },
  code: { type: String, required: true },
  version: { type: Number, required: true, min: 1 },
  name: { type: String, required: true },
  currency: { type: String, required: true },
  amountMinor: { type: Number, required: true, min: 0 },
  fractionDigits: { type: Number, required: true, min: 0, max: 4 },
  interval: { type: String, enum: ['month', 'year'], required: true },
  seats: { type: Number, required: true, min: 1 },
  storageLimitBytes: { type: Number, required: true, min: 1 },
} as const;
export const planTermsSchema = new Schema(termsDefinition, { _id: false });

const schema = new Schema(
  {
    ...termsDefinition,
    active: { type: Boolean, default: true },
    assignmentRevision: { type: Number, default: 0 },
  },
  { timestamps: true },
);
schema.index({ code: 1, version: 1 }, { unique: true });
export type SubscriptionPlan = InferSchemaType<typeof schema>;
export const SubscriptionPlanModel: Model<SubscriptionPlan> =
  (models.SubscriptionPlan as Model<SubscriptionPlan>) ??
  model<SubscriptionPlan>('SubscriptionPlan', schema);

import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { DEFAULT_STORAGE_LIMIT_BYTES, DEFAULT_TRIAL_DAYS } from '../saas';

const schema = new Schema(
  {
    key: { type: String, default: 'platform', unique: true },
    registrationEnabled: { type: Boolean, default: false },
    registrationEmailTenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },
    registrationMode: {
      type: String,
      enum: ['approval_required', 'automatic'],
      default: 'approval_required',
    },
    trialDays: { type: Number, default: DEFAULT_TRIAL_DAYS, min: 1, max: 365 },
    storageLimitBytes: { type: Number, default: DEFAULT_STORAGE_LIMIT_BYTES, min: 1 },
  },
  { timestamps: true },
);

export type PlatformSettings = InferSchemaType<typeof schema>;
export const PlatformSettingsModel: Model<PlatformSettings> =
  (models.PlatformSettings as Model<PlatformSettings>) ??
  model<PlatformSettings>('PlatformSettings', schema);

import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * A one-time link to set a new password, sent to the account's registered email.
 *
 * Only a hash of the token is stored, like sessions, so a copy of the database cannot be used to
 * take over accounts. A link works once and for thirty minutes.
 */
const passwordResetSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// MongoDB deletes spent and expired links by itself a day after they lapse.
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export type PasswordReset = InferSchemaType<typeof passwordResetSchema>;

export const PasswordResetModel: Model<PasswordReset> =
  (models.PasswordReset as Model<PasswordReset>) ??
  model<PasswordReset>('PasswordReset', passwordResetSchema);

import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * Sessions live in the database so that an administrator can revoke one, and so that a stolen
 * cookie stops working the moment the session is deleted. The cookie carries only the token; every
 * request resolves it here.
 *
 * expiresAt carries a TTL index, so MongoDB removes expired sessions without a cleanup job.
 */

const sessionSchema = new Schema(
  {
    token: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

    /** Set when a platform admin is viewing another tenant. Null means their own tenant. */
    impersonatedTenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },

    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },

    createdAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: false },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type Session = InferSchemaType<typeof sessionSchema>;

export const SessionModel: Model<Session> =
  (models.Session as Model<Session>) ?? model<Session>('Session', sessionSchema);

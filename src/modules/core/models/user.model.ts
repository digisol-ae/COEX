import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { ROLES } from '../permissions';

/**
 * A user belongs to exactly one tenant. DigiSol staff who administer the platform hold the
 * platform_admin role inside the DigiSol tenant and may switch tenant context, which is audited.
 *
 * passwordHash is absent for accounts that sign in through Microsoft Entra only.
 */

const userSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    title: { type: String, default: null },

    role: { type: String, enum: ROLES, required: true },
    permissionGrants: { type: [String], default: [] },
    permissionDenials: { type: [String], default: [] },

    passwordHash: { type: String, default: null, select: false },
    mustChangePassword: { type: Boolean, default: false },

    /** Set once the account has signed in through Entra, so the two identities stay linked. */
    entraObjectId: { type: String, default: null, index: true, sparse: true },

    status: {
      type: String,
      enum: ['active', 'invited', 'suspended'],
      default: 'active',
      index: true,
    },
    lastSignedInAt: { type: Date, default: null },

    /**
     * The person's own order for the menu groups, by group id. Kept on the account rather than in
     * the browser so it follows them to their phone. Unknown or missing ids fall back to the
     * standard order, so a group added later still appears.
     */
    navigationOrder: { type: [String], default: [] },

    /** Optional link to the customer record, used by the client contact role. */
    organisationId: { type: Schema.Types.ObjectId, ref: 'Organisation', default: null },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

export type User = InferSchemaType<typeof userSchema>;

export const UserModel: Model<User> =
  (models.User as Model<User>) ?? model<User>('User', userSchema);

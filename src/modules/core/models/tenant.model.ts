import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * A tenant is one customer of the platform. DigiSol itself is the first tenant; client companies
 * are added later. The commercial block is stored from the start but stays unused until a billing
 * model is decided.
 */

const tenantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },

    timezone: { type: String, default: 'Asia/Dubai' },
    locale: { type: String, default: 'en' },
    currency: { type: String, default: 'AED' },

    branding: {
      primaryColor: { type: String, default: '#0f172a' },
      logoUrl: { type: String, default: null },
    },

    numbering: {
      taskPrefix: { type: String, default: 'T' },
      ticketPrefix: { type: String, default: 'S' },
    },

    modules: {
      tasks: { type: Boolean, default: true },
      tickets: { type: Boolean, default: true },
      crm: { type: Boolean, default: true },
    },

    /** Inert until a billing model is chosen. Recorded so that no migration is needed later. */
    commercial: {
      plan: { type: String, default: null },
      seats: { type: Number, default: null },
      startedAt: { type: Date, default: null },
    },

    attachmentRetentionMonths: { type: Number, default: 24 },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

export type Tenant = InferSchemaType<typeof tenantSchema>;

export const TenantModel: Model<Tenant> =
  (models.Tenant as Model<Tenant>) ?? model<Tenant>('Tenant', tenantSchema);

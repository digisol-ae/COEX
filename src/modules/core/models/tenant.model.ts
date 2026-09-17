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

    /**
     * The working calendar, used by service level targets. A four hour response promise must not
     * expire overnight or over a weekend, so the clock only runs during these hours.
     * 0 is Sunday. The Gulf working week runs Monday to Friday.
     */
    workingDays: { type: [Number], default: [1, 2, 3, 4, 5] },
    /** Minutes from midnight, so 9:00 is 540. */
    dayStartMinutes: { type: Number, default: 9 * 60 },
    dayEndMinutes: { type: Number, default: 18 * 60 },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

export type Tenant = InferSchemaType<typeof tenantSchema>;

export const TenantModel: Model<Tenant> =
  (models.Tenant as Model<Tenant>) ?? model<Tenant>('Tenant', tenantSchema);

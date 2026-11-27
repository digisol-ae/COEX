import { planTermsSchema } from './subscription-plan.model';
import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { DEFAULT_STORAGE_LIMIT_BYTES } from '../saas';

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
      letterhead: {
        logoDataUrl: { type: String, default: '' },
        address: { type: String, default: '' },
        contact: { type: String, default: '' },
        footer: { type: String, default: '' },
      },
    },

    agreementDefaults: {
      supportPortal: { type: String, default: '' },
      supportEmail: { type: String, default: '' },
      supportPhone: { type: String, default: '' },
      supportWhatsapp: { type: String, default: '' },
      providerSignerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    },

    numbering: {
      taskPrefix: { type: String, default: 'T' },
      ticketPrefix: { type: String, default: 'S' },
      contractPrefix: { type: String, default: 'C' },
      leadPrefix: { type: String, default: 'L' },
      opportunityPrefix: { type: String, default: 'O' },
    },

    /** Days without activity before the owner of an open opportunity is reminded. */
    opportunityStaleDays: { type: Number, default: 14 },

    /** Why deals are lost; edited in Setup, Pipeline. Kept as text on each opportunity. */
    lostReasons: {
      type: [String],
      default: () => ['Price', 'Competitor', 'Timing', 'No budget', 'No reply'],
    },

    /** Where leads come from; the list is DigiSol's to edit in Setup, Tenant settings. */
    leadSources: {
      type: [String],
      default: () => ['Referral', 'Website', 'Event', 'Phone call', 'Email', 'WhatsApp', 'Other'],
    },

    modules: {
      tasks: { type: Boolean, default: true },
      tickets: { type: Boolean, default: true },
      crm: { type: Boolean, default: true },
      payroll: { type: Boolean, default: false },
    },

    /** Platform-owned subscription data. Tenant settings must never accept these fields. */
    commercial: {
      status: {
        type: String,
        enum: ['legacy', 'trialing', 'active', 'past_due', 'expired', 'canceled'],
        default: 'legacy',
      },
      plan: { type: String, default: null },
      planSnapshot: { type: planTermsSchema, default: null },
      seats: { type: Number, default: null },
      startedAt: { type: Date, default: null },
      trialEndsAt: { type: Date, default: null },
      accessEndsAt: { type: Date, default: null },
      billingProvider: { type: String, default: null },
      billingCustomerId: { type: String, default: null },
      billingSubscriptionId: { type: String, default: null },
    },

    seatRevision: { type: Number, default: 0 },

    storageLimitBytes: { type: Number, default: DEFAULT_STORAGE_LIMIT_BYTES, min: 1 },
    // Null means the existing store has not been counted yet. Reservations are atomic.
    storageUsedBytes: { type: Number, default: null, min: 0 },

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

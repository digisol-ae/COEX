import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * A possible customer who has not been qualified yet (Full CRM, P2.2a).
 *
 * A lead is not a customer: it has no organisation, so it stays out of the customer list and the
 * customer timeline until it converts (P2.2c). Nothing deletes: a lead that goes nowhere is
 * disqualified with a reason, and an archived lead only leaves the list.
 *
 * mobile is stored in E.164 for the same reason a contact's is: XVERSE matches WhatsApp by number,
 * and a lead that later writes in on WhatsApp must find its record.
 */

export const LEAD_STATUSES = ['new', 'working', 'converted', 'disqualified'] as const;

const leadSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

    number: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    company: { type: String, default: null, trim: true },
    email: { type: String, default: null, lowercase: true, trim: true, index: true },
    mobile: { type: String, default: null, index: true },

    /** A value from the tenant's list. Kept as text so renaming a source never orphans a lead. */
    source: { type: String, default: null },

    /** The salesperson responsible. */
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    status: { type: String, enum: LEAD_STATUSES, default: 'new', index: true },
    disqualifiedReason: { type: String, default: null },

    notes: { type: String, default: null },

    /** Values for the tenant's own lead fields. */
    customFields: { type: Map, of: Schema.Types.Mixed, default: () => new Map() },

    /** Filled by conversion (P2.2c). */
    convertedTo: {
      organisationId: { type: Schema.Types.ObjectId, ref: 'Organisation', default: null },
      contactId: { type: Schema.Types.ObjectId, ref: 'Contact', default: null },
      opportunityId: { type: Schema.Types.ObjectId, default: null },
    },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

leadSchema.index({ tenantId: 1, number: 1 }, { unique: true });

export type Lead = InferSchemaType<typeof leadSchema>;

export const LeadModel: Model<Lead> =
  (models.Lead as Model<Lead>) ?? model<Lead>('Lead', leadSchema);

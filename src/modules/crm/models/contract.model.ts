import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * A service agreement with a customer: an annual maintenance contract (AMC), a project or a
 * subscription.
 *
 * Billing happens entirely in Zoho Books (John, 4 Oct 2026), so a contract records the commercial
 * terms and the billing rhythm and never issues an invoice.
 *
 * Dates are calendar days held as YYYY-MM-DD text, not timestamps. A contract that ends on 31
 * December ends on that day wherever the reader sits; a timestamp sliced to a date would slip a
 * day across time zones.
 *
 * Stored status holds only what a person decides. Expiring and expired follow from the end date
 * (see contract-status.ts), so no scheduled job has to flip them and none can be missed.
 */

export const CONTRACT_TYPES = ['amc', 'project', 'subscription'] as const;
export const CONTRACT_STATUSES = ['draft', 'active', 'renewed', 'cancelled'] as const;
export const BILLING_FREQUENCIES = ['monthly', 'bimonthly', 'quarterly', 'yearly'] as const;

const contractSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

    number: { type: String, required: true },
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: CONTRACT_TYPES, default: 'amc' },
    status: { type: String, enum: CONTRACT_STATUSES, default: 'draft', index: true },

    startDate: { type: String, required: true },
    endDate: { type: String, required: true },

    billingFrequency: { type: String, enum: BILLING_FREQUENCIES, default: 'yearly' },
    /** Per billing period, in integer minor units, with the currency stated explicitly. */
    valueMinorUnits: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'AED' },

    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],

    /** A link into Microsoft 365: documents are never stored here (decision 5). */
    documentUrl: { type: String, default: null },
    /** Free text until the read only Zoho Books link exists. */
    zohoReference: { type: String, default: null },

    /** Optional per contract. Exceeding the hours warns and never blocks. */
    supportHoursEnabled: { type: Boolean, default: false },
    includedHoursPerPeriod: { type: Number, default: null, min: 0 },

    /** Renewing creates a new contract that points back, so history is never edited. */
    renewedFromId: { type: Schema.Types.ObjectId, ref: 'Contract', default: null },

    notes: { type: String, default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

contractSchema.index({ tenantId: 1, number: 1 }, { unique: true });
contractSchema.index({ tenantId: 1, endDate: 1 });

export type Contract = InferSchemaType<typeof contractSchema>;

export const ContractModel: Model<Contract> =
  (models.Contract as Model<Contract>) ?? model<Contract>('Contract', contractSchema);

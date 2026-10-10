import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * A potential sale to a customer (Full CRM, P2.2b).
 *
 * Always attached to a customer; a lead converts first (P2.2c). Money is integer minor units with
 * an explicit currency. The one-off part (licence, setup) and the recurring part (AMC,
 * subscription, per year) are kept apart and never added together (John, 10 Oct 2026).
 *
 * Stored status follows the stage's kind, so a deal is won or lost because it sits in the won or
 * lost stage, not because of its name. Nothing deletes: an archived opportunity only leaves lists.
 */

export const OPPORTUNITY_STATUSES = ['open', 'won', 'lost'] as const;

const opportunitySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

    number: { type: String, required: true },
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      index: true,
    },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', default: null },
    title: { type: String, required: true, trim: true },

    stageId: { type: Schema.Types.ObjectId, ref: 'PipelineStage', required: true, index: true },
    status: { type: String, enum: OPPORTUNITY_STATUSES, default: 'open', index: true },

    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    oneOffMinorUnits: { type: Number, default: 0, min: 0 },
    /** Per year, so an AMC billed monthly is still entered as its yearly value. */
    recurringMinorUnits: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'AED' },

    expectedCloseDate: { type: String, default: null },
    probability: { type: Number, min: 0, max: 100, default: 0 },

    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],

    lostReason: { type: String, default: null },
    closedAt: { type: Date, default: null },

    nextStep: { type: String, default: null },
    nextStepDate: { type: String, default: null },

    /** The Zoho Books quote number, as plain text: quotes are made in Zoho. */
    quoteReference: { type: String, default: null },

    notes: { type: String, default: null },

    /** Last time anyone touched the deal; the stale reminder counts days from here. */
    lastActivityAt: { type: Date, default: Date.now },
    /** The next step date a reminder was already sent for, so it is sent once per date. */
    nextStepRemindedFor: { type: String, default: null },
    /** When the stale reminder was last sent; a new one waits for fresh activity first. */
    staleRemindedAt: { type: Date, default: null },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

opportunitySchema.index({ tenantId: 1, number: 1 }, { unique: true });

export type Opportunity = InferSchemaType<typeof opportunitySchema>;

export const OpportunityModel: Model<Opportunity> =
  (models.Opportunity as Model<Opportunity>) ??
  model<Opportunity>('Opportunity', opportunitySchema);

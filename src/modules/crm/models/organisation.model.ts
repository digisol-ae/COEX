import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * The customer master. One record per company, shared by Tickets, Tasks and every later module,
 * so that a client has one history rather than one per system.
 *
 * kind carries what the company is to us today. A prospect becomes a client without losing its
 * history, which is the whole reason the CRM foundation is built before the sales pipeline.
 */

const organisationSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

    name: { type: String, required: true, trim: true },
    kind: {
      type: String,
      enum: ['client', 'prospect', 'supplier', 'partner'],
      default: 'prospect',
      index: true,
    },

    industry: { type: String, default: null },
    website: { type: String, default: null },
    phone: { type: String, default: null },
    email: { type: String, default: null, lowercase: true, trim: true },

    /** Free text, deliberately not a structured address until a module needs one. */
    address: { type: String, default: null },
    country: { type: String, default: 'AE' },

    ownerId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    tags: { type: [String], default: [] },
    notes: { type: String, default: null },

    /** Values for the tenant's own field definitions. */
    customFields: { type: Map, of: Schema.Types.Mixed, default: () => new Map() },

    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

organisationSchema.index({ tenantId: 1, name: 1 });

export type Organisation = InferSchemaType<typeof organisationSchema>;

export const OrganisationModel: Model<Organisation> =
  (models.Organisation as Model<Organisation>) ??
  model<Organisation>('Organisation', organisationSchema);

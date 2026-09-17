import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * What DigiSol sells and supports: R4+, dOne, XVerse and their modules.
 *
 * Contracts, CRM and any later invoicing all price from this list rather than keeping their own,
 * so a rename happens once. Money is stored as integer minor units with an explicit currency, even
 * though Phase 1 barely uses it.
 */

const productSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    kind: {
      type: String,
      enum: ['software', 'module', 'service', 'hardware', 'support'],
      default: 'software',
      index: true,
    },

    description: { type: String, default: null },

    listPriceMinorUnits: { type: Number, default: null },
    currency: { type: String, default: 'AED' },
    /** once, monthly, yearly. Contracts reads this when renewals arrive. */
    billingPeriod: {
      type: String,
      enum: ['once', 'monthly', 'quarterly', 'yearly'],
      default: 'once',
    },

    status: { type: String, enum: ['active', 'retired'], default: 'active', index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

productSchema.index({ tenantId: 1, code: 1 }, { unique: true });

export type Product = InferSchemaType<typeof productSchema>;

export const ProductModel: Model<Product> =
  (models.Product as Model<Product>) ?? model<Product>('Product', productSchema);

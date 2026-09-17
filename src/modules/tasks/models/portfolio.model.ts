import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * A business area such as Support, Product or Implementation.
 *
 * Our own word, chosen over ClickUp's "Space" because it is what your managers already say. A
 * portfolio owns projects; a project owns tasks. Two levels, no more, because deeper nesting is
 * what made ClickUp hard to hold in the head.
 */

const portfolioSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },

    ownerId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    /** Managers may see only their own portfolios; this is the list that decides. */
    managerIds: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },

    sortOrder: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

portfolioSchema.index({ tenantId: 1, name: 1 });

export type Portfolio = InferSchemaType<typeof portfolioSchema>;

export const PortfolioModel: Model<Portfolio> =
  (models.Portfolio as Model<Portfolio>) ?? model<Portfolio>('Portfolio', portfolioSchema);

import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * Per tenant counters for human readable numbers such as DGS-T-1042.
 *
 * One document per tenant and series, incremented atomically. A number is never reused, even if
 * the record it belonged to is archived, because people quote these numbers in email and on the
 * phone and two records sharing one number is worse than a gap in the sequence.
 */

const numberSeriesSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    series: { type: String, required: true },
    /** No default: the first $inc on a missing field produces 1, which is the first number. */
    nextValue: { type: Number },
  },
  { timestamps: true },
);

numberSeriesSchema.index({ tenantId: 1, series: 1 }, { unique: true });

export type NumberSeries = InferSchemaType<typeof numberSeriesSchema>;

export const NumberSeriesModel: Model<NumberSeries> =
  (models.NumberSeries as Model<NumberSeries>) ??
  model<NumberSeries>('NumberSeries', numberSeriesSchema);

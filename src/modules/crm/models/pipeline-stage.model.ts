import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * One step of the sales pipeline. One pipeline per tenant (John, 10 Oct 2026: keep it simple).
 *
 * Exactly one stage is `won` and one is `lost`; the rest are `open`. The kind is fixed when the
 * stage is created, so a deal's outcome never depends on what a stage happens to be called.
 */

export const STAGE_KINDS = ['open', 'won', 'lost'] as const;

const pipelineStageSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    kind: { type: String, enum: STAGE_KINDS, default: 'open' },
    /** Percent chance of winning once a deal reaches this stage; adjustable per opportunity. */
    probability: { type: Number, min: 0, max: 100, default: 0 },
    sortOrder: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

export type PipelineStage = InferSchemaType<typeof pipelineStageSchema>;

export const PipelineStageModel: Model<PipelineStage> =
  (models.PipelineStage as Model<PipelineStage>) ??
  model<PipelineStage>('PipelineStage', pipelineStageSchema);

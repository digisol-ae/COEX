import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * Per tenant custom fields.
 *
 * A client tenant can extend organisations, contacts, tasks and tickets without a code change,
 * which is what makes COEX sellable to a company whose process differs from DigiSol's. Values live
 * in the customFields map on each record; this collection describes what those keys mean.
 */

const fieldDefinitionSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

    entityType: {
      type: String,
      enum: ['organisation', 'contact', 'location', 'task', 'ticket'],
      required: true,
      index: true,
    },

    /** Stable key used inside customFields. Never changed after creation. */
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },

    type: {
      type: String,
      enum: ['text', 'number', 'date', 'select', 'checkbox'],
      required: true,
    },
    options: { type: [String], default: [] },

    required: { type: Boolean, default: false },
    helpText: { type: String, default: null },
    sortOrder: { type: Number, default: 0 },

    status: { type: String, enum: ['active', 'hidden'], default: 'active', index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

fieldDefinitionSchema.index({ tenantId: 1, entityType: 1, key: 1 }, { unique: true });

export type FieldDefinition = InferSchemaType<typeof fieldDefinitionSchema>;

export const FieldDefinitionModel: Model<FieldDefinition> =
  (models.FieldDefinition as Model<FieldDefinition>) ??
  model<FieldDefinition>('FieldDefinition', fieldDefinitionSchema);

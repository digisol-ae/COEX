import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * A site or branch under an organisation. Contracts and AMC later attach coverage per location,
 * and Tickets can be raised against one, which is how a ten branch dental group stays legible.
 */

const locationSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      index: true,
    },

    name: { type: String, required: true, trim: true },
    address: { type: String, default: null },
    city: { type: String, default: null },
    country: { type: String, default: 'AE' },
    phone: { type: String, default: null },

    /** Licence or facility identifier, which UAE healthcare clients ask to see on documents. */
    referenceCode: { type: String, default: null },

    customFields: { type: Map, of: Schema.Types.Mixed, default: () => new Map() },

    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

locationSchema.index({ tenantId: 1, organisationId: 1, name: 1 });

export type Location = InferSchemaType<typeof locationSchema>;

export const LocationModel: Model<Location> =
  (models.Location as Model<Location>) ?? model<Location>('Location', locationSchema);

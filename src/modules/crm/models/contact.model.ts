import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * A person inside a customer organisation.
 *
 * mobile is stored in E.164 form because XVERSE matches inbound WhatsApp messages on it. A number
 * saved as 050 123 4567 will never match a message from +971501234567, so normalisation happens on
 * the way in rather than being attempted later.
 */

const contactSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    organisationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      index: true,
    },
    locationId: { type: Schema.Types.ObjectId, ref: 'Location', default: null },

    name: { type: String, required: true, trim: true },
    title: { type: String, default: null },

    email: { type: String, default: null, lowercase: true, trim: true },
    mobile: { type: String, default: null, index: true },
    phone: { type: String, default: null },

    /** The person Tickets replies to by default when the organisation raises one. */
    isPrimary: { type: Boolean, default: false },
    /** Client contacts with a login hold a user record; this links the two. */
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    notes: { type: String, default: null },
    customFields: { type: Map, of: Schema.Types.Mixed, default: () => new Map() },

    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

contactSchema.index({ tenantId: 1, mobile: 1 });
contactSchema.index({ tenantId: 1, organisationId: 1, name: 1 });

export type Contact = InferSchemaType<typeof contactSchema>;

export const ContactModel: Model<Contact> =
  (models.Contact as Model<Contact>) ?? model<Contact>('Contact', contactSchema);

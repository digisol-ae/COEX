import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * Something a person should hear about in their browser: a task given to them, a ticket assigned
 * to them, a new ticket (John, 1 Oct 2026). Recorded beside each staff alert email, whether or not
 * email is switched on, and kept for 30 days.
 */
const notificationSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    /** Where clicking takes them, a path inside COEX. */
    link: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

notificationSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export type Notification = InferSchemaType<typeof notificationSchema>;

export const NotificationModel: Model<Notification> =
  (models.Notification as Model<Notification>) ??
  model<Notification>('Notification', notificationSchema);

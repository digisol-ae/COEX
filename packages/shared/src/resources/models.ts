import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const resourceSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    product: { type: String, default: '' },
    category: { type: String, default: '' },
    kind: { type: String, enum: ['document', 'video'], required: true },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    fileKey: { type: String, default: null },
    fileName: { type: String, default: null },
    contentType: { type: String, default: null },
    bytes: { type: Number, default: 0 },
    videoUrl: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);
resourceSchema.index({ tenantId: 1, status: 1, title: 1 });
const snapshotSchema = new Schema(
  {
    resourceId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    kind: { type: String, enum: ['document', 'video'], required: true },
    fileKey: { type: String, default: null },
    fileName: { type: String, default: null },
    contentType: { type: String, default: null },
    videoUrl: { type: String, default: null },
  },
  { _id: false },
);
const shareSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    organisationId: { type: Schema.Types.ObjectId, required: true },
    recipientEmail: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    resources: { type: [snapshotSchema], required: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    requestKey: { type: String, required: true },
    ticketId: { type: Schema.Types.ObjectId, default: null },
    ticketMessageId: { type: Schema.Types.ObjectId, default: null },
    createdBy: { type: Schema.Types.ObjectId, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    deliveryStatus: { type: String, enum: ['preparing', 'queued', 'failed'], default: 'preparing' },
    otpHash: { type: String, default: null, select: false },
    otpNonce: { type: String, default: null, select: false },
    otpUsedAt: { type: Date, default: null },
    otpSentAt: { type: Date, required: true },
    otpAttempts: { type: Number, default: 0 },
    otpSendCount: { type: Number, default: 1 },
    firstOpenedAt: { type: Date, default: null },
    lastOpenedAt: { type: Date, default: null },
    downloads: { type: Number, default: 0 },
  },
  { timestamps: true },
);
shareSchema.index({ tenantId: 1, requestKey: 1 }, { unique: true });
const accessSchema = new Schema(
  {
    shareId: { type: Schema.Types.ObjectId, required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true },
);
type Resource = InferSchemaType<typeof resourceSchema>;
type Share = InferSchemaType<typeof shareSchema>;
type Access = InferSchemaType<typeof accessSchema>;
export const ResourceModel: Model<Resource> =
  (models.Resource as Model<Resource>) ?? model<Resource>('Resource', resourceSchema);
export const ResourceShareModel: Model<Share> =
  (models.ResourceShare as Model<Share>) ?? model<Share>('ResourceShare', shareSchema);
export const ResourceAccessModel: Model<Access> =
  (models.ResourceAccess as Model<Access>) ?? model<Access>('ResourceAccess', accessSchema);

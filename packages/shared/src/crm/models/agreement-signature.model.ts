import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    contractId: { type: Schema.Types.ObjectId, required: true },
    contactId: { type: Schema.Types.ObjectId, required: true },
    requestedBy: { type: Schema.Types.ObjectId, required: true },
    contractNumber: { type: String, required: true },
    customerName: { type: String, required: true },
    coverDetails: {
      type: new Schema(
        {
          title: { type: String, required: true },
          productNames: { type: [String], default: undefined },
          startDate: { type: String, required: true },
          endDate: { type: String, required: true },
        },
        { _id: false },
      ),
      default: null,
      immutable: true,
    },
    signerName: { type: String, required: true },
    signerEmail: { type: String, required: true },
    draftRevision: { type: Number, required: true },
    body: { type: String, required: true, immutable: true },
    bodyHash: { type: String, required: true, immutable: true },
    letterhead: {
      type: new Schema(
        {
          name: { type: String, required: true },
          logoDataUrl: { type: String, required: true },
          address: { type: String, required: true },
          contact: { type: String, default: '' },
          footer: { type: String, default: '' },
          color: { type: String, required: true },
        },
        { _id: false },
      ),
      default: null,
      immutable: true,
    },
    documentHash: { type: String, default: null, immutable: true },
    consentText: { type: String, required: true, immutable: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'signed', 'cancelled'], default: 'pending' },
    signedAt: { type: Date, default: null },
    firstPartyInvitation: {
      type: new Schema(
        {
          userId: { type: Schema.Types.ObjectId, required: true },
          name: { type: String, required: true },
          email: { type: String, required: true },
        },
        { _id: false },
      ),
      default: null,
      immutable: true,
    },
    customerInvitedAt: { type: Date, default: null },
    firstParty: {
      type: new Schema(
        {
          userId: { type: Schema.Types.ObjectId, required: true },
          name: { type: String, required: true },
          signedAt: { type: Date, required: true },
          consent: { type: String, required: true },
          verifiedAt: { type: Date },
          invitedEmail: { type: String },
          mac: { type: String, required: true },
          signatureMethod: { type: String, enum: ['typed', 'drawn', 'uploaded'], required: true },
          signatureStyle: { type: Number, required: true },
          signatureSealed: { type: String, default: null },
          signatureHash: { type: String, default: null },
        },
        { _id: false },
      ),
      default: null,
    },
    signedName: { type: String, default: null },
    signerUserAgent: { type: String, default: null },
    signatureMethod: { type: String, enum: ['typed', 'drawn', 'uploaded', null], default: null },
    signatureStyle: { type: Number, default: 0 },
    signatureSealed: { type: String, default: null },
    signatureHash: { type: String, default: null },
    otpCodeHash: { type: String, default: null },
    otpSentAt: { type: Date, default: null },
    otpExpiresAt: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },
    otpSendCount: { type: Number, default: 0 },
    otpWindowStartedAt: { type: Date, default: null },
    accessTokenHash: { type: String, default: null },
    accessExpiresAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
    signerVerifiedAt: { type: Date, default: null },
    completionMac: { type: String, default: null },
    securityVersion: { type: Number, default: 1, immutable: true },
    privacyNoticeVersion: { type: String, default: null, immutable: true },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
// A second click or simultaneous staff request cannot produce two live signing links.
schema.index(
  { tenantId: 1, contractId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
  },
);
export type AgreementSignature = InferSchemaType<typeof schema>;
export const AgreementSignatureModel: Model<AgreementSignature> =
  (models.AgreementSignature as Model<AgreementSignature>) ?? model('AgreementSignature', schema);

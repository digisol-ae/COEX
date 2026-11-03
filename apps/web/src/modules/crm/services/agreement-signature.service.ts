import { createHash, randomBytes, randomInt } from 'node:crypto';
import { Types } from 'mongoose';
import { AgreementSignatureModel } from '@coex/shared/crm/models/agreement-signature.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { getCurrentTenant } from '@/modules/core/services/tenant.service';
import { ContactModel } from '@coex/shared/crm/models/contact.model';
import { EmailOutboxModel } from '@coex/shared/core/models/email-outbox.model';
import { assertAgreementComplete } from '@coex/shared/crm/contract-drafting';
import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { getContext, runWithContext } from '@/lib/tenant-context';
import { recordAudit } from '@/modules/core/services/audit.service';
import { appBaseUrl, queueEmail } from '@/modules/core/services/email.service';
import { getAgreementDraft } from './agreement.service';
import { getContract } from './contract.service';
import { getTenantLetterhead } from './tenant-letterhead.service';
import { validateLetterhead, letterheadDocument } from '@coex/shared/crm/letterhead';
import type { AgreementSignature } from '@coex/shared/crm/models/agreement-signature.model';
import type { SignatureCapture } from '@coex/shared/crm/signature-capture';
import {
  signingMac,
  equalDigest,
  prepareSignature,
  completionPayload,
  verifyCompletion,
} from '../signature-evidence';

const requests = () => repository(AgreementSignatureModel);
const digest = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
const CONSENT =
  'I have read this agreement, am authorised to sign on behalf of the customer, and agree to its terms. By applying my signature and selecting Sign agreement, I intend to sign this agreement electronically.';
const messageIdFor = (id: unknown) => `<agreement-signature-${String(id)}@worktello.com>`;

export async function listSignatureHistory(
  input: { contractId?: string; page?: number; status?: string } = {},
) {
  await connectToDatabase();
  const page =
    Number.isSafeInteger(input.page) && input.page! > 0 ? Math.min(input.page!, 100000) : 1;
  const pageSize = 20;
  const now = new Date();
  const filter = {
    ...(input.contractId ? { contractId: input.contractId } : {}),
    ...(input.status === 'expired'
      ? {
          $or: [
            { status: 'pending' as const, expiresAt: { $lte: now } },
            { cancellationReason: 'expired' },
          ],
        }
      : input.status === 'pending'
        ? { status: 'pending' as const, expiresAt: { $gt: now } }
        : input.status === 'cancelled'
          ? { status: 'cancelled' as const, cancellationReason: { $ne: 'expired' } }
          : input.status === 'signed'
            ? { status: 'signed' as const }
            : {}),
  };
  const [rows, total, tenant] = await Promise.all([
    requests()
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    requests().count(filter),
    getCurrentTenant(),
  ]);
  const [deliveries, senders] = await Promise.all([
    EmailOutboxModel.find({
      tenantId: getContext().tenantId,
      messageId: { $in: rows.map((r) => messageIdFor(r._id)) },
    }).select('messageId status sentAt'),
    UserModel.find({
      tenantId: getContext().tenantId,
      _id: { $in: rows.map((r) => r.requestedBy) },
    }).select('name'),
  ]);
  const delivery = new Map(deliveries.map((d) => [d.messageId, d]));
  const names = new Map(senders.map((u) => [String(u._id), u.name]));
  return {
    page,
    pageSize,
    total,
    timezone: tenant.timezone ?? 'Asia/Dubai',
    history: rows.map((r) => ({
      evidenceValid: (() => {
        if (r.status !== 'signed') return true;
        try {
          verifyCompletion(r);
          return true;
        } catch {
          return false;
        }
      })(),
      id: String(r._id),
      contractId: String(r.contractId),
      contractNumber: r.contractNumber,
      customerName: r.customerName,
      requestedBy: names.get(String(r.requestedBy)) ?? String(r.requestedBy),
      signerName: r.signerName,
      signerEmail: r.signerEmail,
      revision: r.draftRevision,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      status:
        r.cancellationReason === 'expired' || (r.status === 'pending' && r.expiresAt <= now)
          ? 'expired'
          : r.status,
      deliveryStatus: delivery.get(messageIdFor(r._id))?.status ?? 'not_queued',
      sentAt: delivery.get(messageIdFor(r._id))?.sentAt?.toISOString() ?? null,
      signedAt: r.signedAt?.toISOString() ?? null,
      signedName: r.signedName,
      cancelledAt: r.cancelledAt?.toISOString() ?? null,
      needsLetterhead: !r.letterhead,
    })),
  };
}

export async function signatureWorkspace(contractId: string, page = 1) {
  const contract = await getContract(contractId);
  if (!contract) throw new Error('Contract not found.');
  const [draft, contacts, ledger, letterhead, pendingRequest] = await Promise.all([
    getAgreementDraft(contractId),
    repository(ContactModel)
      .find({ organisationId: contract.organisationId, status: 'active' })
      .sort({ name: 1 }),
    listSignatureHistory({ contractId, page }),
    getTenantLetterhead(),
    requests().findOne({ contractId, status: 'pending', expiresAt: { $gt: new Date() } }),
  ]);
  let letterheadError = '';
  try {
    validateLetterhead(letterhead);
  } catch (error) {
    letterheadError = (error as Error).message;
  }
  return {
    ...ledger,
    letterhead,
    letterheadError,
    draft,
    hasPending: Boolean(pendingRequest),
    contacts: contacts
      .filter((c) => c.email)
      .map((c) => ({ id: String(c._id), name: c.name, email: c.email! })),
  };
}

export async function requestAgreementSignature(
  contractId: string,
  contactId: string,
  revision: number,
) {
  await connectToDatabase();
  const contract = await getContract(contractId);
  if (!contract) throw new Error('Contract not found.');
  if (contract.status === 'cancelled' || contract.status === 'renewed')
    throw new Error('This contract is no longer available for signature.');
  const draft = await getAgreementDraft(contractId);
  if (!draft?.reviewed || draft.revision !== revision)
    throw new Error('Save and review the current agreement before sending for signature.');
  assertAgreementComplete(draft.body);
  if (!Types.ObjectId.isValid(contactId)) throw new Error('Choose a customer contact.');
  const contact = await repository(ContactModel).findOne({
    _id: contactId,
    organisationId: contract.organisationId,
    status: 'active',
  });
  if (!contact?.email) throw new Error('Choose an active customer contact with an email address.');
  const letterhead = await getTenantLetterhead();
  validateLetterhead(letterhead);
  signingMac('configuration-check');
  const now = new Date();
  // Retain expired requests as history while releasing the single-pending-request slot.
  await requests().updateOne(
    { contractId, status: 'pending', expiresAt: { $lte: now } },
    {
      $set: { status: 'cancelled', cancelledAt: now, cancellationReason: 'expired' },
    },
  );
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + 14 * 86400000);
  let request;
  try {
    request = await requests().create({
      contractId: new Types.ObjectId(contractId),
      contactId: contact._id,
      requestedBy: getContext().userId,
      contractNumber: contract.number,
      customerName: contract.organisationName,
      signerName: contact.name,
      signerEmail: contact.email,
      draftRevision: draft.revision,
      body: draft.body,
      bodyHash: digest(draft.body),
      letterhead,
      documentHash: digest(letterheadDocument(draft.body, letterhead)),
      securityVersion: 3,
      privacyNoticeVersion: '2026-11-03',
      consentText: CONSENT,
      tokenHash: digest(token),
      expiresAt,
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000)
      throw new Error(
        'A signature request is already awaiting signature. Cancel it before sending another.',
      );
    throw error;
  }
  try {
    const queued = await queueEmail({
      kind: 'contract_email',
      to: contact.email,
      messageId: messageIdFor(request._id),
      subject: `Signature requested: ${contract.number} — ${contract.title}`,
      text: `Hello ${contact.name},\n\nPlease review and sign the agreement for ${contract.organisationName}:\n\n${appBaseUrl()}/sign/${token}\n\nThis private link expires on ${expiresAt.toISOString().slice(0, 10)}. Do not forward it. If you are not authorised to sign, contact the sender.\n\nYou can save a copy after signing.`,
    });
    if (!queued)
      throw new Error(
        'Email sending is disabled or the signer email is invalid. Configure outbound email before trying again.',
      );
  } catch (error) {
    await requests().updateOne(
      { _id: request._id, status: 'pending' },
      {
        $set: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: 'email_not_queued',
        },
      },
    );
    throw error;
  }
  await recordAudit({
    action: 'agreement.signature_requested',
    entityType: 'Contract',
    entityId: new Types.ObjectId(contractId),
    after: {
      requestId: String(request._id),
      signerEmail: contact.email,
      draftRevision: draft.revision,
      bodyHash: request.bodyHash,
      documentHash: request.documentHash,
    },
  });
  return String(request._id);
}

export async function cancelAgreementSignature(contractId: string, requestId: string) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(requestId)) throw new Error('Signature request not found.');
  const saved = await requests().updateOne(
    { _id: requestId, contractId, status: 'pending' },
    {
      $set: { status: 'cancelled', cancelledAt: new Date(), cancellationReason: 'staff_cancelled' },
    },
  );
  if (!saved)
    throw new Error('This request is no longer awaiting signature. Reload to see its status.');
  await recordAudit({
    action: 'agreement.signature_cancelled',
    entityType: 'Contract',
    entityId: saved.contractId,
    after: { requestId },
  });
}

// This is the sole public database boundary. A 256-bit bearer capability resolves exactly one
// snapshot; neither tenant, customer nor contract IDs are accepted from the unauthenticated caller.
export async function publicSignatureRequest(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  await connectToDatabase();
  const request = await AgreementSignatureModel.findOne({
    tokenHash: digest(token),
    deletedAt: null,
    status: { $in: ['pending', 'signed'] },
    expiresAt: { $gt: new Date() },
  });
  if (request?.status === 'pending' && !request.letterhead) return null;
  if (!request || digest(request.body) !== request.bodyHash) return null;
  if (
    request.letterhead &&
    (!request.documentHash ||
      digest(letterheadDocument(request.body, request.letterhead)) !== request.documentHash)
  )
    return null;
  if (request.status === 'signed') {
    try {
      verifyCompletion(request);
    } catch {
      return null;
    }
  }
  return request;
}

export const signingCookieName = (id: unknown) => `wt_sign_${String(id)}`;
export function hasSigningAccess(request: AgreementSignature, accessToken?: string) {
  return Boolean(
    accessToken &&
    /^[A-Za-z0-9_-]{43}$/.test(accessToken) &&
    request.accessTokenHash &&
    request.accessExpiresAt &&
    request.accessExpiresAt > new Date() &&
    equalDigest(request.accessTokenHash, digest(accessToken)),
  );
}

export async function requestSigningCode(token: string) {
  const request = await publicSignatureRequest(token);
  if (!request) throw new Error('This signing link is unavailable or expired.');
  const now = new Date();
  const resetWindow =
    !request.otpWindowStartedAt ||
    request.otpWindowStartedAt.getTime() <= now.getTime() - 30 * 60000;
  if (
    (!resetWindow && request.otpSendCount >= 5) ||
    (request.otpSentAt && request.otpSentAt.getTime() > now.getTime() - 60000)
  )
    throw new Error(
      'Please wait before requesting another code. You can request five codes per 30 minutes.',
    );
  const code = String(randomInt(100000, 1000000));
  const codeHash = signingMac(`${request._id}:${code}`);
  const saved = await AgreementSignatureModel.findOneAndUpdate(
    {
      _id: request._id,
      tenantId: request.tenantId,
      status: request.status,
      expiresAt: { $gt: now },
      otpSentAt: request.otpSentAt ?? null,
      $or: [{ otpSendCount: request.otpSendCount }, { otpSendCount: { $exists: false } }],
    },
    {
      $set: {
        otpCodeHash: codeHash,
        otpSentAt: now,
        otpExpiresAt: new Date(now.getTime() + 10 * 60000),
        otpAttempts: 0,
        otpSendCount: resetWindow ? 1 : request.otpSendCount + 1,
        otpWindowStartedAt: resetWindow ? now : request.otpWindowStartedAt,
      },
    },
    { returnDocument: 'after' },
  );
  if (!saved) throw new Error('A code was just requested. Please check your email.');
  const queued = await runWithContext(
    { tenantId: request.tenantId, userId: request.requestedBy, isPlatformAdmin: false },
    () =>
      queueEmail({
        kind: 'password_reset',
        to: request.signerEmail,
        subject: `Your agreement verification code — ${request.contractNumber}`,
        text: `Your Worktello agreement verification code is ${code}. It expires in 10 minutes. This code permits access to the agreement and signing. Do not share it. If you did not request this, contact the sender.`,
      }),
  );
  if (!queued) {
    await AgreementSignatureModel.updateOne(
      { _id: request._id, tenantId: request.tenantId, otpCodeHash: codeHash },
      { $set: { otpCodeHash: null, otpSentAt: null } },
    );
    throw new Error('The code could not be queued. Contact the sender to check email delivery.');
  }
}

export async function verifySigningCode(token: string, code: string) {
  if (!/^\d{6}$/.test(code)) throw new Error('Enter the six-digit code from your email.');
  const request = await publicSignatureRequest(token);
  if (!request) throw new Error('This signing link is unavailable or expired.');
  const now = new Date();
  // Increment attempts atomically, including for wrong codes; concurrent guessing is bounded.
  const attempted = await AgreementSignatureModel.findOneAndUpdate(
    {
      _id: request._id,
      tenantId: request.tenantId,
      status: request.status,
      otpCodeHash: { $ne: null },
      otpExpiresAt: { $gt: now },
      otpAttempts: { $lt: 5 },
    },
    { $inc: { otpAttempts: 1 } },
    { returnDocument: 'after' },
  );
  const codeHash = signingMac(`${request._id}:${code}`);
  if (!attempted?.otpCodeHash || !equalDigest(attempted.otpCodeHash, codeHash))
    throw new Error('Code is incorrect or expired. After five attempts, request a new code.');
  const accessToken = randomBytes(32).toString('base64url');
  const verified = await AgreementSignatureModel.findOneAndUpdate(
    {
      _id: request._id,
      tenantId: request.tenantId,
      status: request.status,
      otpCodeHash: codeHash,
      otpExpiresAt: { $gt: new Date() },
    },
    {
      $set: {
        otpCodeHash: null,
        accessTokenHash: digest(accessToken),
        accessExpiresAt: new Date(now.getTime() + 30 * 60000),
        verifiedAt: now,
      },
    },
    { returnDocument: 'after' },
  );
  if (!verified) throw new Error('This code was already used or expired. Request a new code.');
  return { requestId: String(request._id), accessToken };
}

export async function signAgreement(
  token: string,
  input: {
    name: string;
    consent: boolean;
    userAgent: string;
    accessToken?: string;
    capture?: SignatureCapture;
  },
) {
  if (
    typeof input.name !== 'string' ||
    input.name.trim().length < 2 ||
    input.name.trim().length > 200 ||
    input.consent !== true
  )
    throw new Error('Enter your full name and accept the agreement to sign.');
  const request = await publicSignatureRequest(token);
  if (!request)
    throw new Error('This signing link is unavailable or has expired. Contact the sender.');
  if (!hasSigningAccess(request, input.accessToken))
    throw new Error('Verify your email again before signing.');
  if (request.status === 'signed')
    throw new Error('This request is already signed. Reload to see its status.');
  const signature = await prepareSignature(input.capture ?? { method: 'typed' });
  const signedAt = new Date();
  const evidence = {
    ...request.toObject(),
    ...signature,
    signedName: input.name.trim(),
    signedAt,
    signerUserAgent: input.userAgent.slice(0, 500),
    signerVerifiedAt: request.verifiedAt,
  };
  const completionMac = signingMac(completionPayload(evidence));
  // Name, consent, document hash and server timestamp are committed together. Replay and cancel
  // races cannot overwrite evidence. No automatic change to commercial contract status occurs.
  const saved = await AgreementSignatureModel.findOneAndUpdate(
    {
      _id: request._id,
      tenantId: request.tenantId,
      tokenHash: digest(token),
      status: 'pending',
      expiresAt: { $gt: new Date() },
      bodyHash: request.bodyHash,
      accessTokenHash: digest(input.accessToken!),
      accessExpiresAt: { $gt: signedAt },
    },
    {
      $set: {
        status: 'signed',
        signedName: input.name.trim(),
        signedAt,
        ...signature,
        completionMac,
        signerVerifiedAt: request.verifiedAt,
        signerUserAgent: input.userAgent.slice(0, 500),
      },
    },
    { returnDocument: 'after' },
  );
  if (!saved)
    throw new Error(
      'This request is already signed, cancelled or expired. Reload to see its status.',
    );
  return saved;
}

export async function staffSignedAgreement(contractId: string, requestId: string) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(requestId)) return null;
  const request = await requests().findOne({ _id: requestId, contractId, status: 'signed' });
  if (request) verifyCompletion(request);
  return request;
}

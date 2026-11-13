import { displayDate } from '@coex/shared/crm/display-date';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { STAFF_ROLES } from '@coex/shared/core/permissions';
import { Types } from 'mongoose';
import { AgreementSignatureModel } from '@coex/shared/crm/models/agreement-signature.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import {
  getCurrentTenant,
  listContractProviderSigners,
} from '@/modules/core/services/tenant.service';
import { ProductModel } from '@coex/shared/crm/models/product.model';
import { ContractModel } from '@coex/shared/crm/models/contract.model';
import { ContactModel } from '@coex/shared/crm/models/contact.model';
import { EmailOutboxModel } from '@coex/shared/core/models/email-outbox.model';
import { assertAgreementComplete } from '@coex/shared/crm/contract-drafting';
import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { getContext, runWithContext } from '@/lib/tenant-context';
import { recordAudit } from '@/modules/core/services/audit.service';
import { normaliseCc } from '@coex/shared/tickets/collaborators';
import {
  appBaseUrl,
  contractEmailSenders,
  queueEmail,
} from '@/modules/core/services/email.service';
import { escapeAgreementHtml as escape } from '../letterhead-html';
import { getAgreementDraft } from './agreement.service';
import { getContract } from './contract.service';
import { getTenantLetterhead } from './tenant-letterhead.service';
import { validateLetterhead, letterheadDocument } from '@coex/shared/crm/letterhead';
import type { AgreementSignature } from '@coex/shared/crm/models/agreement-signature.model';
import { FIRST_PARTY_CONSENT, type SignatureCapture } from '@coex/shared/crm/signature-capture';
import {
  signingMac,
  equalDigest,
  prepareSignature,
  completionPayload,
  verifyCompletion,
  firstPartyMac,
  verifyFirstParty,
} from '../signature-evidence';

const requests = () => repository(AgreementSignatureModel);
const digest = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
const CONSENT =
  'I have read this agreement, am authorised to sign on behalf of the customer, and agree to its terms. By applying my signature and selecting Sign agreement, I intend to sign this agreement electronically.';
const providerMessageId = (id: unknown) => `<agreement-first-party-${String(id)}@worktello.com>`;
export function pendingProviderInvitation(request: AgreementSignature) {
  return request.customerInvitedAt ? null : request.firstPartyInvitation;
}
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
  const signedIds = rows.filter(({ status }) => status === 'signed').map(({ _id }) => _id);
  const [deliveries, senders, copyEmails] = await Promise.all([
    EmailOutboxModel.find({
      tenantId: getContext().tenantId,
      messageId: { $in: rows.flatMap((r) => [messageIdFor(r._id), providerMessageId(r._id)]) },
    }).select('messageId status sentAt'),
    UserModel.find({
      tenantId: getContext().tenantId,
      _id: { $in: rows.map((r) => r.requestedBy) },
    }).select('name'),
    input.contractId && signedIds.length
      ? EmailOutboxModel.find({
          tenantId: getContext().tenantId,
          kind: 'contract_email',
          $or: [
            { signedCopyRequestId: { $in: signedIds } },
            // Earlier copies only stored the request ID inside the Worktello link.
            {
              signedCopyRequestId: null,
              text: new RegExp(
                '^Download copy of your contract: https?://[^/]+/sign/copy-(' +
                  signedIds.join('|') +
                  ')-',
                'm',
              ),
            },
          ],
        })
          .select('signedCopyRequestId to cc sender subject status createdAt sentAt text')
          .sort({ createdAt: -1, _id: -1 })
      : [],
  ]);
  const delivery = new Map(deliveries.map((d) => [d.messageId, d]));
  const names = new Map(senders.map((u) => [String(u._id), u.name]));
  const copiesByRequest = Map.groupBy(
    copyEmails,
    (email) =>
      email.signedCopyRequestId?.toString() ??
      /^Download copy of your contract: https?:\/\/[^/]+\/sign\/copy-([a-f0-9]{24})-/m.exec(
        email.text,
      )?.[1],
  );
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
      contactId: String(r.contactId),
      revision: r.draftRevision,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      status:
        r.cancellationReason === 'expired' || (r.status === 'pending' && r.expiresAt <= now)
          ? 'expired'
          : r.status,
      deliveryStatus: delivery.get(messageIdFor(r._id))?.status ?? 'not_queued',
      sentAt: delivery.get(messageIdFor(r._id))?.sentAt?.toISOString() ?? null,
      copyEmails: (copiesByRequest.get(String(r._id)) ?? []).map((email) => ({
        id: String(email._id),
        to: email.to,
        cc: email.cc,
        subject: email.subject,
        status: email.status,
        createdAt: email.createdAt.toISOString(),
        sentAt: email.sentAt?.toISOString() ?? null,
      })),
      signedAt: r.signedAt?.toISOString() ?? null,
      signedName: r.signedName,
      firstPartyInviteEmail: r.firstPartyInvitation?.email ?? null,
      firstPartyDeliveryStatus: delivery.get(providerMessageId(r._id))?.status ?? null,
      customerInvited: !r.firstPartyInvitation || Boolean(r.customerInvitedAt),
      firstPartySignedName: r.firstParty?.name ?? null,
      cancelledAt: r.cancelledAt?.toISOString() ?? null,
      needsLetterhead: !r.letterhead,
    })),
  };
}

export async function signatureWorkspace(contractId: string, page = 1) {
  const contract = await getContract(contractId);
  if (!contract) throw new Error('Contract not found.');
  const [draft, contacts, ledger, letterhead, pendingRequest, emailSenders, staff, tenant] =
    await Promise.all([
      getAgreementDraft(contractId),
      repository(ContactModel)
        .find({ organisationId: contract.organisationId, status: 'active' })
        .sort({ name: 1 }),
      listSignatureHistory({ contractId, page }),
      getTenantLetterhead(),
      requests().findOne({ contractId, status: 'pending', expiresAt: { $gt: new Date() } }),
      contractEmailSenders(),
      listContractProviderSigners(),
      getCurrentTenant(),
    ]);
  let letterheadError = '';
  try {
    validateLetterhead(letterhead);
  } catch (error) {
    letterheadError = (error as Error).message;
  }
  const eligible = contacts.filter((contact) => contact.email);
  const linked = eligible.filter((contact) => contract.contactIds.includes(String(contact._id)));
  const candidates = linked.length ? linked : eligible;
  const primary = candidates.filter((contact) => contact.isPrimary);
  const defaultContact =
    primary.length === 1 ? primary[0] : candidates.length === 1 ? candidates[0] : undefined;
  return {
    ...ledger,
    letterhead,
    letterheadError,
    emailSenders,
    draft,
    hasPending: Boolean(pendingRequest),
    defaultContactId: defaultContact?._id.toString() ?? '',
    defaultProviderSignerId:
      staff
        .find(({ _id }) => _id.equals(tenant.agreementDefaults?.providerSignerId ?? undefined))
        ?._id.toString() ?? '',
    staffSigners: staff.map(({ _id, name, email }) => ({ id: String(_id), name, email })),
    contacts: eligible.map((c) => ({ id: String(c._id), name: c.name, email: c.email! })),
  };
}

export async function requestAgreementSignature(
  contractId: string,
  contactId: string,
  revision: number,
  provider?: { name: string; consent: boolean; capture: SignatureCapture },
  providerUserId?: string,
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
  const invitedProvider =
    providerUserId && Types.ObjectId.isValid(providerUserId)
      ? await UserModel.findOne({
          _id: providerUserId,
          tenantId: getContext().tenantId,
          role: { $in: STAFF_ROLES },
          status: 'active',
          deletedAt: null,
        }).select('name email')
      : null;
  if (providerUserId && (!invitedProvider?.email || provider))
    throw new Error('Choose an active First Party signer.');
  const letterhead = await getTenantLetterhead();
  validateLetterhead(letterhead);
  signingMac('configuration-check');
  const productNames = await agreementProductNames(getContext().tenantId, contract.productIds);
  const now = new Date();
  if (
    provider &&
    (typeof provider.name !== 'string' ||
      provider.name.trim().length < 2 ||
      provider.name.trim().length > 200 ||
      provider.consent !== true)
  )
    throw new Error('Enter your full name and accept the first-party agreement.');
  const firstParty = provider
    ? {
        userId: getContext().userId,
        name: provider.name.trim(),
        signedAt: now,
        consent: FIRST_PARTY_CONSENT,
        ...(await prepareSignature(provider.capture)),
      }
    : null;
  // Retain expired requests as history while releasing the single-pending-request slot.
  await requests().updateOne(
    { contractId, status: 'pending', expiresAt: { $lte: now } },
    {
      $set: { status: 'cancelled', cancelledAt: now, cancellationReason: 'expired' },
    },
  );
  const requestId = new Types.ObjectId();
  const documentHash = digest(letterheadDocument(draft.body, letterhead));
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + 14 * 86400000);
  const input = {
    _id: requestId,
    contractId: new Types.ObjectId(contractId),
    contactId: contact._id,
    requestedBy: getContext().userId,
    contractNumber: contract.number,
    customerName: contract.organisationName,
    coverDetails: {
      title: contract.title,
      productNames,
      startDate: contract.startDate,
      endDate: contract.endDate,
    },
    signerName: contact.name,
    signerEmail: contact.email,
    draftRevision: draft.revision,
    body: draft.body,
    bodyHash: digest(draft.body),
    letterhead,
    documentHash,
    firstParty: firstParty
      ? { ...firstParty, mac: firstPartyMac(requestId, documentHash, firstParty) }
      : null,
    firstPartyInvitation: invitedProvider
      ? { userId: invitedProvider._id, name: invitedProvider.name, email: invitedProvider.email }
      : null,
    securityVersion: invitedProvider ? 5 : firstParty ? 4 : 3,
    privacyNoticeVersion: '2026-11-03',
    consentText: CONSENT,
    tokenHash: digest(token),
    expiresAt,
  };
  let request;
  try {
    request = await requests().create(input);
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
      to: invitedProvider?.email ?? contact.email,
      messageId: invitedProvider ? providerMessageId(request._id) : messageIdFor(request._id),
      subject: `${invitedProvider ? 'First Party signature requested' : 'Signature requested'}: ${contract.number} — ${contract.title}`,
      text: `Hello ${invitedProvider?.name ?? contact.name},\n\nPlease review and sign the agreement for ${contract.organisationName}:\n\n${appBaseUrl()}/sign/${token}${invitedProvider ? `\n\nYou can also sign from Requests and Approvals in Worktello:\n${appBaseUrl()}/requests/${request._id}` : ''}\n\nThis private link expires on ${displayDate(expiresAt.toISOString().slice(0, 10))}. Do not forward it. If you are not authorised to sign, contact the sender.\n\nYou can save a copy after signing.`,
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
      signerEmail: invitedProvider?.email ?? contact.email,
      draftRevision: draft.revision,
      bodyHash: request.bodyHash,
      documentHash: request.documentHash,
    },
  });
  return String(request._id);
}

export async function sendSecondPartyInvitation(
  contractId: string,
  requestId: string,
  draft?: {
    contactId: string;
    sender: string;
    cc: string;
    subject: string;
    message: string;
    signature: string;
  },
) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(requestId)) throw new Error('Signature request not found.');
  const request = await requests().findOne({
    _id: requestId,
    contractId,
    status: 'pending',
    expiresAt: { $gt: new Date() },
    firstPartyInvitation: { $ne: null },
    firstParty: { $ne: null },
    customerInvitedAt: null,
  });
  if (!request) throw new Error('The First Party must sign before sending to the Second Party.');
  verifyFirstParty(request);
  const token = Buffer.from(signingMac(`second-party:${request._id}`), 'hex').toString('base64url');
  const messageId = messageIdFor(request._id);
  const contact =
    draft && Types.ObjectId.isValid(draft.contactId)
      ? await repository(ContactModel).findOne({
          _id: draft.contactId,
          organisationId: (await getContract(contractId))?.organisationId,
          status: 'active',
        })
      : null;
  const sender = draft && (await contractEmailSenders()).find(({ role }) => role === draft.sender);
  if (draft && (!contact?.email || !sender))
    throw new Error('Choose an active customer signer and a configured sender.');
  if (
    draft &&
    (!draft.subject.trim() ||
      /[\r\n]/.test(draft.subject) ||
      draft.subject.length > 250 ||
      !draft.message.trim() ||
      draft.message.length > 10000 ||
      draft.signature.length > 2000 ||
      draft.cc.length > 10000)
  )
    throw new Error('Check the subject, message, CC and email signature.');
  const recipient = contact?.email ?? request.signerEmail;
  const cc = draft
    ? normaliseCc(
        draft.cc
          .split(/[,;\n]/)
          .map((value) => value.trim())
          .filter(Boolean),
        recipient,
      )
    : [];
  if (cc.length > 49) throw new Error('Use at most 49 CC addresses.');
  const prior = await EmailOutboxModel.findOne({ tenantId: request.tenantId, messageId }).select(
    'to',
  );
  if (prior && prior.to !== recipient)
    throw new Error('An invitation was already queued for a different signer.');
  if (
    !prior &&
    !(await queueEmail({
      kind: 'contract_email',
      to: recipient,
      cc,
      sender: sender ? sender.role : undefined,
      messageId,
      outboxId: new Types.ObjectId(digest(messageId).slice(0, 24)),
      subject:
        draft?.subject.trim() ?? `Second Party signature requested: ${request.contractNumber}`,
      text: `${draft?.message.trim() ?? `Hello ${request.signerName},\n\nPlease review and sign your agreement:`}

${appBaseUrl()}/sign/${token}

This private link is valid for 14 days. Do not forward it.${draft?.signature.trim() ? `\n\n${draft.signature.trim()}` : ''}`,
    }))
  )
    throw new Error('The customer invitation could not be queued. Check outbound email and retry.');
  const queued = await EmailOutboxModel.findOne({ tenantId: request.tenantId, messageId }).select(
    'to',
  );
  if (queued?.to !== recipient)
    throw new Error('An invitation was already queued for a different signer.');
  const now = new Date();
  const updated = await requests().updateOne(
    { _id: request._id, status: 'pending', customerInvitedAt: null, tokenHash: request.tokenHash },
    {
      $set: {
        ...(contact
          ? { contactId: contact._id, signerName: contact.name, signerEmail: recipient }
          : {}),
        customerInvitedAt: now,
        tokenHash: digest(token),
        expiresAt: new Date(now.getTime() + 14 * 86400000),
        otpCodeHash: null,
        otpSentAt: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        otpSendCount: 0,
        otpWindowStartedAt: null,
        accessTokenHash: null,
        accessExpiresAt: null,
        verifiedAt: null,
      },
    },
  );
  if (!updated)
    throw new Error('This request was already updated. Reload to see its current status.');
  await recordAudit({
    action: 'agreement.second_party_signature_requested',
    entityType: 'Contract',
    entityId: request.contractId,
    after: { requestId, signerEmail: recipient, draftRevision: request.draftRevision },
  });
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
  const now = new Date();
  const copy = /^copy-([a-f0-9]{24})-([0-9]{13})-([a-f0-9]{64})$/.exec(token);
  if (copy) {
    const [, requestId, expiry, mac] = copy;
    if (
      Number(expiry) <= now.getTime() ||
      !equalDigest(mac, signingMac(`copy:${requestId}:${expiry}`))
    )
      return null;
  } else if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return null;
  }
  await connectToDatabase();
  const request = await AgreementSignatureModel.findOne({
    deletedAt: null,
    ...(copy
      ? { _id: copy[1], status: 'signed' }
      : {
          tokenHash: digest(token),
          status: { $in: ['pending', 'signed'] },
          expiresAt: { $gt: now },
        }),
  });
  if (request?.status === 'pending' && !request.letterhead) return null;
  if (!request || digest(request.body) !== request.bodyHash) return null;
  if (
    request.letterhead &&
    (!request.documentHash ||
      digest(letterheadDocument(request.body, request.letterhead)) !== request.documentHash)
  )
    return null;
  try {
    if (request.status === 'signed') verifyCompletion(request);
    else verifyFirstParty(request);
  } catch {
    return null;
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
      tokenHash: request.tokenHash,
      ...(request.status === 'pending' ? { expiresAt: { $gt: now } } : {}),
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
        to: pendingProviderInvitation(request)?.email ?? request.signerEmail,
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
      tokenHash: request.tokenHash,
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
      tokenHash: request.tokenHash,
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

function myProviderRequests() {
  return {
    'firstPartyInvitation.userId': getContext().userId,
    status: 'pending' as const,
    firstParty: null,
    customerInvitedAt: null,
    expiresAt: { $gt: new Date() },
  };
}

export async function myContractSigningRequests() {
  await connectToDatabase();
  return requests()
    .find(myProviderRequests())
    .select('contractNumber customerName')
    .sort({ createdAt: -1 });
}

export async function myContractSigningRequest(id: string) {
  await connectToDatabase();
  return Types.ObjectId.isValid(id)
    ? requests().findOne({ _id: id, ...myProviderRequests() })
    : null;
}

export async function signFirstPartyInWorktello(
  id: string,
  consent: boolean,
  capture: SignatureCapture,
) {
  if (consent !== true) throw new Error('Accept the First Party agreement before signing.');
  const request = await myContractSigningRequest(id);
  if (
    !request?.firstPartyInvitation ||
    !request.letterhead ||
    digest(request.body) !== request.bodyHash ||
    digest(letterheadDocument(request.body, request.letterhead)) !== request.documentHash
  )
    throw new Error('This signing request is unavailable.');
  const party = {
    userId: getContext().userId,
    name: request.firstPartyInvitation.name,
    signedAt: new Date(),
    consent: FIRST_PARTY_CONSENT,
    ...(await prepareSignature(capture)),
  };
  const saved = await requests().updateOne(
    { _id: request._id, ...myProviderRequests(), documentHash: request.documentHash },
    {
      $set: {
        firstParty: { ...party, mac: firstPartyMac(request._id, request.documentHash, party) },
      },
    },
  );
  if (!saved) throw new Error('This request has already been signed, cancelled or expired.');
  await recordAudit({
    action: 'agreement.first_party_signed_in_worktello',
    entityType: 'Contract',
    entityId: request.contractId,
    after: { requestId: id },
  });
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
  const invitedProvider = pendingProviderInvitation(request);
  if (invitedProvider) {
    if (request.firstParty || !request.verifiedAt)
      throw new Error('The First Party has already signed.');
    const party = {
      userId: invitedProvider.userId,
      name: input.name.trim(),
      signedAt,
      consent: FIRST_PARTY_CONSENT,
      invitedEmail: invitedProvider.email,
      verifiedAt: request.verifiedAt,
      ...signature,
    };
    const saved = await AgreementSignatureModel.findOneAndUpdate(
      {
        _id: request._id,
        tenantId: request.tenantId,
        tokenHash: digest(token),
        status: 'pending',
        firstParty: null,
        expiresAt: { $gt: signedAt },
        accessTokenHash: digest(input.accessToken!),
        accessExpiresAt: { $gt: signedAt },
      },
      {
        $set: {
          firstParty: { ...party, mac: firstPartyMac(request._id, request.documentHash, party) },
        },
      },
      { returnDocument: 'after' },
    );
    if (!saved) throw new Error('This request was already signed, cancelled or expired.');
    return saved;
  }
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

/** Older signature requests did not snapshot the cover fields. */
export async function legacyAgreementCover(request: AgreementSignature) {
  return ContractModel.findOne({ _id: request.contractId, tenantId: request.tenantId })
    .select('title startDate endDate')
    .lean();
}

async function agreementProductNames(
  tenantId: Types.ObjectId,
  productIds: (string | Types.ObjectId)[],
) {
  if (!productIds.length) return [];
  const products = await ProductModel.find({ tenantId, _id: { $in: productIds } })
    .select('name')
    .sort({ name: 1 })
    .lean();
  return products.map(({ name }) => name);
}

export async function signingPageDetails(request: AgreementSignature) {
  const snapshot = request.coverDetails;
  if (snapshot?.productNames) return snapshot;

  const contract = await ContractModel.findOne({
    _id: request.contractId,
    tenantId: request.tenantId,
  })
    .select('title startDate endDate productIds')
    .lean();
  const details = snapshot ?? contract;
  if (!details) return null;
  const productNames = await agreementProductNames(request.tenantId, contract?.productIds ?? []);
  return {
    title: details.title,
    startDate: details.startDate,
    endDate: details.endDate,
    productNames,
  };
}

export async function emailSignedAgreement(
  contractId: string,
  requestId: string,
  draft: {
    invoiceLink: string;
    subject: string;
    message: string;
    signature: string;
    sender: string;
    cc: string;
  },
) {
  const { invoiceLink, subject, message, signature } = draft;
  if (!subject.trim() || /[\r\n]/.test(subject) || !message.trim())
    throw new Error('Enter a subject and message for the email.');
  const invoice = URL.canParse(invoiceLink.trim()) ? new URL(invoiceLink.trim()) : null;
  if (!invoice || invoice.protocol !== 'https:' || invoice.username || invoice.password) {
    throw new Error('Paste the HTTPS customer share link from Zoho Books.');
  }

  const request = await staffSignedAgreement(contractId, requestId);
  if (!request) throw new Error('Signed agreement unavailable.');

  const sender = (await contractEmailSenders()).find(({ role }) => role === draft.sender);
  if (!sender) throw new Error('Choose a configured From address.');
  const cc = normaliseCc(
    draft.cc
      .split(/[,;\n]/)
      .map((value) => value.trim())
      .filter(Boolean),
    request.signerEmail,
  );
  if (cc.length > 49) throw new Error('Use at most 49 CC addresses.');

  const expiry = Date.now() + 14 * 86400000;
  const id = String(request._id);
  const mac = signingMac(`copy:${id}:${expiry}`);
  const verificationUrl = `${appBaseUrl()}/sign/copy-${id}-${expiry}-${mac}`;
  const note =
    'The contract link is valid for 14 days. If prompted, verify your email to download it.';
  const links = [
    { label: 'Download copy of your contract', url: verificationUrl },
    { label: 'Download copy of your invoice', url: invoice.href },
  ];
  const accepted = await queueEmail({
    kind: 'contract_email',
    sender: sender.role,
    signedCopyRequestId: request._id,
    cc,
    to: request.signerEmail,
    subject: subject.trim(),
    text: [
      message.trim(),
      ...links.map(({ label, url }) => `${label}: ${url}`),
      note,
      signature.trim(),
    ]
      .filter(Boolean)
      .join('\n\n'),
    html: `<p>${escape(message.trim()).replace(/\r?\n/g, '<br>')}</p><ul>${links.map(({ label, url }) => `<li><a href="${escape(url)}">${label}</a></li>`).join('')}</ul><p>${note}</p>${signature.trim() ? `<p>${escape(signature.trim()).replace(/\r?\n/g, '<br>')}</p>` : ''}`,
  });
  if (!accepted)
    throw new Error('Email could not be queued. Check Setup, Email and the signer address.');
}

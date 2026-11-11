import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import sharp from 'sharp';
import type { AgreementSignature } from '@coex/shared/crm/models/agreement-signature.model';
import type { SignatureCapture } from '@coex/shared/crm/signature-capture';
import { letterheadDocument } from '@coex/shared/crm/letterhead';
import { openSecret, sealSecret } from '@/lib/secret-box';

export function signingMac(value: string) {
  const key = process.env.COEX_ENCRYPTION_KEY ?? process.env.AUTH_SECRET;
  if (!key) throw new Error('Signing security is not configured. Contact the sender.');
  return createHmac('sha256', key).update(`worktello-signing-v1:${value}`).digest('hex');
}
export function equalDigest(a: string, b: string) {
  return (
    /^[a-f0-9]{64}$/.test(a) &&
    /^[a-f0-9]{64}$/.test(b) &&
    timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
  );
}
export async function prepareSignature(capture: SignatureCapture) {
  if (!capture || !['typed', 'drawn', 'uploaded'].includes(capture.method))
    throw new Error('Choose how to sign.');
  const style = capture.style ?? 0;
  if (!Number.isInteger(style) || style < 0 || style > 2)
    throw new Error('Choose a signature style.');
  if (capture.method === 'typed')
    return {
      signatureMethod: capture.method,
      signatureStyle: style,
      signatureSealed: null,
      signatureHash: null,
    };
  if (
    typeof capture.imageDataUrl !== 'string' ||
    capture.imageDataUrl.length > 2800000 ||
    !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(capture.imageDataUrl)
  )
    throw new Error('Use a PNG, JPEG or WebP signature image of at most 2 MB.');
  const image = Buffer.from(capture.imageDataUrl.split(',')[1], 'base64');
  if (image.length > 2 * 1024 * 1024) throw new Error('Use a signature image of at most 2 MB.');
  let png: Buffer;
  try {
    const source = sharp(image, { limitInputPixels: 16000000 });
    const metadata = await source.metadata();
    if (!['png', 'jpeg', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1)
      throw new Error('Invalid image.');
    png = await source
      .rotate()
      .resize({ width: 1000, height: 400, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
    // stats() reads its input pixels; materialise the white composite so a black signature on
    // transparency is not mistaken for an all-black blank image.
    const flattened = await sharp(png).flatten({ background: '#ffffff' }).toBuffer();
    const stats = await sharp(flattened).stats();
    if (stats.channels.slice(0, 3).every((channel) => channel.stdev < 1))
      throw new Error('Blank image.');
  } catch {
    throw new Error(
      'The signature image is blank or unreadable. Draw again or choose a different image.',
    );
  }
  const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
  if (dataUrl.length > 600000)
    throw new Error('The signature image is too detailed. Crop it to just the signature.');
  return {
    signatureMethod: capture.method,
    signatureStyle: 0,
    signatureSealed: sealSecret(dataUrl),
    signatureHash: createHash('sha256').update(dataUrl).digest('hex'),
  };
}

export function completionPayload(request: AgreementSignature & { _id: unknown }) {
  return JSON.stringify({
    ...(request.securityVersion >= 3
      ? {
          version: 3,
          contractId: String(request.contractId),
          contactId: String(request.contactId),
          contractNumber: request.contractNumber,
          customerName: request.customerName,
          invitedName: request.signerName,
          draftRevision: request.draftRevision,
          requestedBy: String(request.requestedBy),
          requestedAt: request.createdAt.toISOString(),
          invitationExpiresAt: request.expiresAt.toISOString(),
        }
      : {}),
    ...(request.coverDetails
      ? {
          coverDetails: {
            title: request.coverDetails.title,
            startDate: request.coverDetails.startDate,
            endDate: request.coverDetails.endDate,
          },
        }
      : {}),
    requestId: String(request._id),
    tenantId: String(request.tenantId),
    documentHash: request.documentHash,
    bodyHash: request.bodyHash,
    email: request.signerEmail,
    name: request.signedName,
    at: request.signedAt?.toISOString(),
    consent: request.consentText,
    method: request.signatureMethod,
    style: request.signatureStyle,
    signatureHash: request.signatureHash,
    verifiedAt: request.signerVerifiedAt?.toISOString(),
    privacyNoticeVersion: request.privacyNoticeVersion,
    userAgent: request.signerUserAgent,
  });
}
export function verifyCompletion(request: AgreementSignature & { _id: unknown }) {
  verifySignaturePresence(request);
  const hash = (value: string) => createHash('sha256').update(value).digest('hex');
  if (
    !equalDigest(hash(request.body), request.bodyHash) ||
    (request.letterhead &&
      (!request.documentHash ||
        !equalDigest(
          hash(letterheadDocument(request.body, request.letterhead)),
          request.documentHash,
        )))
  )
    throw new Error('The signed document could not be verified. Contact the sender.');
  if (request.securityVersion >= 2 && request.status === 'signed' && !request.completionMac)
    throw new Error('The signature record could not be verified. Contact the sender.');
  if (
    request.completionMac &&
    !equalDigest(request.completionMac, signingMac(completionPayload(request)))
  )
    throw new Error('The signature record could not be verified. Contact the sender.');
}

function verifySignaturePresence(request: AgreementSignature) {
  const imageMethod = request.signatureMethod === 'drawn' || request.signatureMethod === 'uploaded';
  if (
    (imageMethod && (!request.signatureSealed || !request.signatureHash)) ||
    (!imageMethod && (request.signatureSealed || request.signatureHash)) ||
    (request.securityVersion >= 2 && request.status === 'signed' && !request.signatureMethod)
  )
    throw new Error('The signature record is incomplete. Contact the sender.');
}

export function signatureImage(request: AgreementSignature) {
  verifySignaturePresence(request);
  if (!request.signatureSealed) return null;
  const value = openSecret(request.signatureSealed);
  if (
    !value ||
    !request.signatureHash ||
    !equalDigest(createHash('sha256').update(value).digest('hex'), request.signatureHash)
  )
    throw new Error('The signature image could not be verified.');
  return value;
}

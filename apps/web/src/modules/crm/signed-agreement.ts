import type { AgreementSignature } from '@coex/shared/crm/models/agreement-signature.model';
import { escapeAgreementHtml as escape, letterheadHtml, letterheadStyles } from './letterhead-html';
import { completionPayload, signatureImage, verifyCompletion } from './signature-evidence';
import { SIGNATURE_STYLES } from '@coex/shared/crm/signature-capture';

/** A portable, printable copy that preserves Unicode and the exact signed wording. */
export function signedAgreementHtml(request: AgreementSignature & { _id: unknown }) {
  if (request.status !== 'signed' || !request.signedAt || !request.signedName)
    throw new Error('The agreement has not been signed.');
  verifyCompletion(request);
  const image = signatureImage(request);
  const style = SIGNATURE_STYLES[request.signatureStyle ?? 0] ?? SIGNATURE_STYLES[0];
  const appearance = image
    ? `<img src="${image}" alt="Customer signature" style="max-width:100%;max-height:160px">`
    : `<p style="font-family:${escape(style.font)};font-style:${style.italic ? 'italic' : 'normal'};font-size:26pt">${escape(request.signedName)}</p>`;
  const letterhead = request.letterhead ? letterheadHtml(request.letterhead) : null;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(request.contractNumber)} — signed agreement</title><style>${letterheadStyles}@page{size:A4;margin:20mm}body{font:11pt Arial,sans-serif;line-height:1.6;max-width:800px;margin:30px auto;padding:20px;color:#111}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}section{border-top:1px solid #bbb;margin-top:30px;padding-top:20px}p{overflow-wrap:anywhere}</style></head><body>${letterhead?.header ?? ''}<h1>Signed agreement</h1><p>${escape(request.contractNumber)} · ${escape(request.customerName)}</p><pre>${escape(request.body)}</pre><section><h2>Electronic signature record</h2>${appearance}<p>Signed by: ${escape(request.signedName)}<br>Invited signer: ${escape(request.signerName)} (${escape(request.signerEmail)})<br>Signed at (UTC): ${request.signedAt.toISOString()}<br>Agreement revision: ${request.draftRevision}<br>Request reference: ${escape(String(request._id))}<br>Agreement SHA-256: ${escape(request.bodyHash)}${request.documentHash ? `<br>Document with letterhead SHA-256: ${escape(request.documentHash)}` : ''}</p><p>${escape(request.consentText)}</p><p>Signing method: ${escape(request.signatureMethod ?? 'typed')}; ${request.signerVerifiedAt ? 'invited email verified at ' + request.signerVerifiedAt.toISOString() : 'private invitation link'}; explicit acceptance.</p></section>${letterhead?.footer ?? ''}</body></html>`;
}

export function signedAgreementResponse(request: AgreementSignature & { _id: unknown }) {
  return new Response(signedAgreementHtml(request), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${request.contractNumber.replace(/[^a-zA-Z0-9-]/g, '')}-signed.html"`,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
      'Content-Security-Policy':
        "default-src 'none'; img-src data:; style-src 'unsafe-inline'; frame-ancestors 'none'; sandbox",
    },
  });
}

/** Export only the authenticated evidence, never the access/OTP secrets or encrypted image. */
export function signingReceiptResponse(request: AgreementSignature & { _id: unknown }) {
  if (request.status !== 'signed' || !request.signedAt || !request.signedName)
    throw new Error('The agreement has not been signed.');
  verifyCompletion(request);
  signatureImage(request);
  const receipt = {
    format: 'worktello.signing-receipt',
    formatVersion: 1,
    evidenceVersion: request.securityVersion,
    evidence: JSON.parse(completionPayload(request)) as Record<string, unknown>,
    authentication: {
      algorithm: request.completionMac ? 'HMAC-SHA256' : null,
      code: request.completionMac,
      scope:
        'Worktello server authentication; not an accredited signer certificate or independent trusted timestamp.',
    },
  };
  return new Response(JSON.stringify(receipt, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${request.contractNumber.replace(/[^a-zA-Z0-9-]/g, '')}-signing-receipt.json"`,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; sandbox",
    },
  });
}

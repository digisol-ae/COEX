import type { AgreementSignature } from '@coex/shared/crm/models/agreement-signature.model';
import { escapeAgreementHtml as escape, letterheadHtml, letterheadStyles } from './letterhead-html';
import { completionPayload, signatureImage, verifyCompletion } from './signature-evidence';
import {
  agreementCoverHeading,
  agreementCoverText,
  agreementCoverRed,
  agreementCoverBlue,
  type AgreementCoverDetails,
} from './agreement-cover';
import { agreementCoverLogo } from './agreement-cover-logo';
import { SIGNATURE_STYLES } from '@coex/shared/crm/signature-capture';

/** A portable, printable copy that preserves Unicode and the exact signed wording. */
export function signedAgreementHtml(
  request: AgreementSignature & { _id: unknown },
  legacyCover?: AgreementCoverDetails | null,
) {
  if (request.status !== 'signed' || !request.signedAt || !request.signedName)
    throw new Error('The agreement has not been signed.');
  verifyCompletion(request);
  const image = signatureImage(request);
  const style = SIGNATURE_STYLES[request.signatureStyle ?? 0] ?? SIGNATURE_STYLES[0];
  const appearance = image
    ? `<img src="${image}" alt="Customer signature" style="max-width:100%;max-height:160px">`
    : `<p style="font-family:${escape(style.font)};font-style:${style.italic ? 'italic' : 'normal'};font-size:26pt">${escape(request.signedName)}</p>`;
  const letterhead = request.letterhead ? letterheadHtml(request.letterhead) : null;
  const { subtitle, period } = agreementCoverText(request.coverDetails ?? legacyCover);
  const cover = `<header class="agreement-cover"><div class="cover-heading"><h1>${agreementCoverHeading}</h1><p>${escape(subtitle)}</p></div><img src="${agreementCoverLogo}" alt="DigiSol · Writing Wellness Into Code"><p class="cover-period">${escape(period)}</p><p class="cover-customer">${escape(request.customerName)}</p></header>`;
  const coverStyles = `
    .agreement-cover{position:relative;min-height:254mm;box-sizing:border-box;border-top:4px solid ${agreementCoverRed};break-after:page;margin-bottom:32px;print-color-adjust:exact;-webkit-print-color-adjust:exact}
    .agreement-cover::before{content:'';position:absolute;right:0;top:-4px;width:10px;height:4px;background:${agreementCoverBlue};border-left:7px solid white}
    .cover-heading{text-align:right;padding-top:8px}
    .cover-heading h1{font-size:14pt;text-transform:uppercase;line-height:1.2;margin:0}
    .cover-heading p{font-size:12pt;font-weight:bold;color:${agreementCoverRed};margin:0}
    .agreement-cover img{position:absolute;top:29%;right:2%;width:37mm;max-width:40%}
    .cover-period,.cover-customer{position:absolute;left:0;right:0;margin:0;font:bold 13pt Georgia,serif}
    .cover-period{top:61%;text-align:right;color:${agreementCoverRed}}
    .cover-customer{top:65%;color:${agreementCoverBlue}}
    @media print{body{margin:0;padding:0}.agreement-cover{margin-bottom:0}}
  `;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(request.contractNumber)} — signed agreement</title><style>${letterheadStyles}@page{size:A4;margin:20mm}body{font:11pt Arial,sans-serif;line-height:1.6;max-width:800px;margin:30px auto;padding:20px;color:#111}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}section{border-top:1px solid #bbb;margin-top:30px;padding-top:20px}p{overflow-wrap:anywhere}${coverStyles}</style></head><body>${cover}${letterhead?.header ?? ''}<h1>Signed agreement</h1><p>${escape(request.contractNumber)} · ${escape(request.customerName)}</p><pre>${escape(request.body)}</pre><section><h2>Electronic signature record</h2>${appearance}<p>Signed by: ${escape(request.signedName)}<br>Invited signer: ${escape(request.signerName)} (${escape(request.signerEmail)})<br>Signed at (UTC): ${request.signedAt.toISOString()}<br>Agreement revision: ${request.draftRevision}<br>Request reference: ${escape(String(request._id))}<br>Agreement SHA-256: ${escape(request.bodyHash)}${request.documentHash ? `<br>Document with letterhead SHA-256: ${escape(request.documentHash)}` : ''}</p><p>${escape(request.consentText)}</p><p>Signing method: ${escape(request.signatureMethod ?? 'typed')}; ${request.signerVerifiedAt ? 'invited email verified at ' + request.signerVerifiedAt.toISOString() : 'private invitation link'}; explicit acceptance.</p></section>${letterhead?.footer ?? ''}</body></html>`;
}

export function signedAgreementResponse(
  request: AgreementSignature & { _id: unknown },
  legacyCover?: AgreementCoverDetails | null,
) {
  return new Response(signedAgreementHtml(request, legacyCover), {
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

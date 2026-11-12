import type { AgreementSignature } from '@coex/shared/crm/models/agreement-signature.model';
import { escapeAgreementHtml as escape } from './letterhead-html';
import { completionPayload, signatureImage, verifyCompletion } from './signature-evidence';
import {
  agreementFooterText,
  agreementHeaderDate,
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
  const party = request.firstParty;
  const signatureColumns = party
    ? [
        {
          role: 'First Party',
          company: request.letterhead?.name ?? 'First Party',
          name: party.name,
          date: party.signedAt,
          data: signatureImage(party),
          style: party.signatureStyle,
        },
        {
          role: 'Second Party',
          company: request.customerName,
          name: request.signedName,
          date: request.signedAt,
          data: image,
          style: request.signatureStyle,
        },
      ]
        .map(({ role, company, name, date, data, style: index }) => {
          const font = SIGNATURE_STYLES[index ?? 0] ?? SIGNATURE_STYLES[0];
          return `<div><strong>${role}</strong><div><strong>${escape(company)}</strong></div><div>${escape(name)}</div><div>Signed ${date.toISOString().slice(0, 10)} UTC</div><div class="party-box">${data ? `<img src="${data}" alt="${role} signature">` : `<span style="font-family:${escape(font.font)};font-style:${font.italic ? 'italic' : 'normal'}">${escape(name)}</span>`}</div></div>`;
        })
        .join('')
    : '';
  const coverDetails = request.coverDetails ?? legacyCover;
  const footer = agreementFooterText(request.letterhead);
  const logoData = request.letterhead?.logoDataUrl ?? '';
  const footerMark = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(logoData)
    ? `<img src="${escape(logoData)}" alt="${escape(request.letterhead?.name ?? '')} logo">`
    : '<b>d.</b>';

  const headerDate = agreementHeaderDate(request.body, coverDetails);
  const { subtitle, period } = agreementCoverText(coverDetails);
  const cover = `<header class="agreement-cover"><div class="cover-heading"><h1>${agreementCoverHeading}</h1><p>${escape(subtitle)}</p></div><img src="${agreementCoverLogo}" alt="DigiSol"><p class="cover-period">${escape(period)}</p><p class="cover-customer">${escape(request.customerName)}</p></header>`;
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
    .party-section{break-inside:avoid}
    .party-signatures{display:grid;gap:16px;overflow-wrap:anywhere}
    .agreement-date{text-align:right;font-size:9pt}.agreement-footer{text-align:center;font-size:8pt}.agreement-footer img{float:right;width:19pt;height:19pt;object-fit:contain}.agreement-footer b{float:right;color:#fff;background:#ef3750;padding:0 4px}.party-box{box-sizing:border-box;margin-top:10px;height:108px;padding:9px;border:1px solid #8c949e;background:#f5f7f9;display:flex;align-items:center;justify-content:center;overflow:hidden}
    .party-box img{width:100%;height:100%;object-fit:contain}
    .party-box span{max-width:100%;font-size:clamp(10px,2.5vw,21px);line-height:1.05;overflow-wrap:anywhere}
    @media print{body{margin:0;padding:0}.agreement-cover{margin-bottom:0}}
  `;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(request.contractNumber)} — signed agreement</title><style>@page{size:A4;margin:20mm}body{font:11pt Arial,sans-serif;line-height:1.6;max-width:800px;margin:30px auto;padding:20px;color:#111}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}section{border-top:1px solid #bbb;margin-top:30px;padding-top:20px}p{overflow-wrap:anywhere}${coverStyles}</style></head><body>${cover}${headerDate ? `<p class="agreement-date">${escape(headerDate)}</p>` : ''}<h1>Signed agreement</h1><p>${escape(request.contractNumber)} · ${escape(request.customerName)}</p><pre>${escape(request.body)}</pre>${party ? `<section class="party-section"><h2>Acceptance and signatures</h2><div class="party-signatures">${signatureColumns}</div></section>` : ''}<section><h2>Electronic signature record</h2>${party ? '' : appearance}<p>Signed by: ${escape(request.signedName)}<br>Invited signer: ${escape(request.signerName)} (${escape(request.signerEmail)})<br>Signed at (UTC): ${request.signedAt.toISOString()}</p><p>${escape(request.consentText)}</p><p>Signing method: ${escape(request.signatureMethod ?? 'typed')}; ${request.signerVerifiedAt ? 'invited email verified at ' + request.signerVerifiedAt.toISOString() : 'private invitation link'}; explicit acceptance.</p></section>${footer ? `<footer class="agreement-footer">${footerMark}${escape(footer)}</footer>` : ''}</body></html>`;
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

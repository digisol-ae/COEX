import type { TenantLetterhead } from '@coex/shared/crm/letterhead';

export const escapeAgreementHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

export const letterheadStyles = `.letterhead{display:flex;flex-wrap:wrap;gap:20px;justify-content:space-between;align-items:flex-start;border-bottom:2px solid;padding-bottom:20px;margin-bottom:24px;break-inside:avoid}.letterhead img{max-width: min(260px,100%);max-height:100px;object-fit:contain}.letterhead-details{flex:1;min-width:180px;text-align:right;overflow-wrap:anywhere}.letterhead-name{font-size:18pt;font-weight:bold}.letterhead-contact,.letterhead-footer{white-space:pre-wrap}.letterhead-contact{font-size:9pt}.letterhead-footer{border-top:1px solid;margin-top:28px;padding-top:14px;text-align:center;font-size:9pt;overflow-wrap:anywhere;break-inside:avoid}@media(max-width:500px){.letterhead-details{text-align:left}}`;

export function letterheadHtml(letterhead: TenantLetterhead) {
  const e = escapeAgreementHtml;
  const color = /^#[0-9a-f]{6}$/i.test(letterhead.color) ? letterhead.color : '#0f172a';
  const logo = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
    letterhead.logoDataUrl,
  )
    ? `<img src="${e(letterhead.logoDataUrl)}" alt="${e(letterhead.name)} logo">`
    : '';
  return {
    header: `<header class="letterhead" style="border-color:${color}">${logo}<div class="letterhead-details"><div class="letterhead-name" style="color:${color}">${e(letterhead.name)}</div><p class="letterhead-contact">${e(letterhead.contact)}</p></div></header>`,
    footer: `<footer class="letterhead-footer" style="border-color:${color}">${e(letterhead.footer || letterhead.name)}</footer>`,
  };
}

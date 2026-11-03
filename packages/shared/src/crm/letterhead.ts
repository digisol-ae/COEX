export interface TenantLetterhead {
  name: string;
  logoDataUrl: string;
  address: string;
  contact: string;
  footer: string;
  color: string;
}

export function validateLetterhead(value: TenantLetterhead) {
  if (!value.name.trim() || value.name.length > 300 || !value.address.trim())
    throw new Error(
      'Configure the tenant name, address and logo in Setup → Tenant settings before sending contracts.',
    );
  if (value.address.length > 2000 || value.contact.length > 1000 || value.footer.length > 1000)
    throw new Error('Letterhead address or footer is too long.');
  if (
    !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value.logoDataUrl) ||
    value.logoDataUrl.length > 600000
  )
    throw new Error(
      'Upload a tenant letterhead logo in Setup → Tenant settings before sending contracts.',
    );
  if (!/^#[0-9a-f]{6}$/i.test(value.color)) throw new Error('Choose a valid letterhead colour.');
}

/** Stable property order: the digest covers the text and the complete embedded letterhead. */
export function letterheadDocument(body: string, letterhead: TenantLetterhead) {
  return JSON.stringify({
    body,
    letterhead: {
      name: letterhead.name,
      logoDataUrl: letterhead.logoDataUrl,
      address: letterhead.address,
      contact: letterhead.contact,
      footer: letterhead.footer,
      color: letterhead.color,
    },
  });
}

/**
 * Mobile numbers are stored in E.164 form, for one reason: XVERSE matches an inbound WhatsApp
 * message to a contact by number. A number saved as 050 123 4567 never matches a message from
 * +971501234567, and the mismatch only shows up months later as tickets that fail to thread.
 *
 * The default country is the tenant's, which for DigiSol is the United Arab Emirates.
 */

const DIALLING_CODES: Record<string, string> = {
  AE: '971',
  PK: '92',
  SA: '966',
  GB: '44',
  US: '1',
};

export function normaliseMobile(input: string | null | undefined, country = 'AE'): string | null {
  if (!input) return null;

  const digits = input.replace(/[^\d+]/g, '');
  if (!digits) return null;

  if (digits.startsWith('+')) {
    return digits;
  }

  const code = DIALLING_CODES[country] ?? DIALLING_CODES.AE;

  // Local form: a leading zero is the national trunk prefix and is dropped before the country code.
  const national = digits.startsWith('0') ? digits.slice(1) : digits;

  if (national.startsWith(code)) {
    return `+${national}`;
  }

  return `+${code}${national}`;
}

export function formatMobileForDisplay(value: string | null | undefined): string {
  return value ?? '';
}

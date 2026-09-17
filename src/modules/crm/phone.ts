/**
 * Mobile numbers are stored in E.164 form, for one reason: XVERSE matches an inbound WhatsApp
 * message to a contact by number. A number saved as 050 123 4567 never matches a message from
 * +971501234567, and the mismatch only shows up months later as conversations that fail to thread.
 *
 * The country is chosen beside the number rather than guessed, because guessing is what produces
 * a database of numbers that look right and never match.
 */

export interface Country {
  code: string;
  name: string;
  dialling: string;
  flag: string;
}

/** The markets DigiSol and its clients actually work in, most used first. */
export const COUNTRIES: Country[] = [
  { code: 'AE', name: 'United Arab Emirates', dialling: '971', flag: '🇦🇪' },
  { code: 'PK', name: 'Pakistan', dialling: '92', flag: '🇵🇰' },
  { code: 'SA', name: 'Saudi Arabia', dialling: '966', flag: '🇸🇦' },
  { code: 'OM', name: 'Oman', dialling: '968', flag: '🇴🇲' },
  { code: 'QA', name: 'Qatar', dialling: '974', flag: '🇶🇦' },
  { code: 'BH', name: 'Bahrain', dialling: '973', flag: '🇧🇭' },
  { code: 'KW', name: 'Kuwait', dialling: '965', flag: '🇰🇼' },
  { code: 'IN', name: 'India', dialling: '91', flag: '🇮🇳' },
  { code: 'EG', name: 'Egypt', dialling: '20', flag: '🇪🇬' },
  { code: 'JO', name: 'Jordan', dialling: '962', flag: '🇯🇴' },
  { code: 'LB', name: 'Lebanon', dialling: '961', flag: '🇱🇧' },
  { code: 'GB', name: 'United Kingdom', dialling: '44', flag: '🇬🇧' },
  { code: 'US', name: 'United States', dialling: '1', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', dialling: '1', flag: '🇨🇦' },
  { code: 'TR', name: 'Turkey', dialling: '90', flag: '🇹🇷' },
  { code: 'PH', name: 'Philippines', dialling: '63', flag: '🇵🇭' },
  { code: 'BD', name: 'Bangladesh', dialling: '880', flag: '🇧🇩' },
  { code: 'LK', name: 'Sri Lanka', dialling: '94', flag: '🇱🇰' },
];

export const DEFAULT_COUNTRY = 'AE';

export function countryFor(code: string | null | undefined): Country {
  return COUNTRIES.find((country) => country.code === code) ?? COUNTRIES[0];
}

export function normaliseMobile(
  input: string | null | undefined,
  country = DEFAULT_COUNTRY,
): string | null {
  if (!input) return null;

  const cleaned = input.replace(/[^\d+]/g, '');
  if (!cleaned) return null;

  // Already international: trust it, whatever the dropdown says.
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  const dialling = countryFor(country).dialling;

  // 00 is the international prefix used across the Gulf and Europe.
  if (cleaned.startsWith('00')) {
    return `+${cleaned.slice(2)}`;
  }

  // A leading zero is the national trunk prefix and is dropped before the country code.
  const national = cleaned.startsWith('0') ? cleaned.slice(1) : cleaned;

  if (national.startsWith(dialling)) {
    return `+${national}`;
  }

  return `+${dialling}${national}`;
}

/** Splits a stored number back into a country and the local part, for editing. */
export function splitMobile(stored: string | null | undefined): {
  country: string;
  local: string;
} {
  if (!stored) return { country: DEFAULT_COUNTRY, local: '' };

  const digits = stored.replace(/^\+/, '');

  const match = [...COUNTRIES]
    .sort((a, b) => b.dialling.length - a.dialling.length)
    .find((country) => digits.startsWith(country.dialling));

  if (!match) return { country: DEFAULT_COUNTRY, local: stored };

  return { country: match.code, local: digits.slice(match.dialling.length) };
}

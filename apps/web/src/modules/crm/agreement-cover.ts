import { displayDate } from '@coex/shared/crm/display-date';
export interface AgreementCoverDetails {
  title: string;
  startDate: string;
  endDate: string;
}

export const agreementCoverHeading = 'Comprehensive Service Level Agreement';
export const agreementCoverRed = '#ef3750';
export const agreementCoverBlue = '#1376c0';

export function agreementCoverText(details?: AgreementCoverDetails | null) {
  return {
    subtitle: details ? `For ${details.title.replace(/^for\s+/i, '')}` : '',
    period: details ? `${displayDate(details.startDate)} to ${displayDate(details.endDate)}` : '',
  };
}

export function agreementHeaderDate(body: string, details?: AgreementCoverDetails | null) {
  const value =
    body.match(/(?:entered(?: into)? on)\s+(\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})\b/i)?.[1] ??
    details?.startDate;
  return value ? displayDate(value) : '';
}

export function agreementFooterText(
  letterhead?: {
    address: string;
    contact: string;
    footer: string;
  } | null,
) {
  if (!letterhead) return '';
  const parts = [letterhead.address, letterhead.footer, letterhead.contact]
    .flatMap((value) => value.split(/\s*\|\s*/))
    .map((value) => value.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const unique = [...new Set(parts)];
  return unique
    .filter((part) => !unique.some((other) => other !== part && other.includes(part)))
    .join(' | ');
}

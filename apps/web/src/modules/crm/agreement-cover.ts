export interface AgreementCoverDetails {
  title: string;
  startDate: string;
  endDate: string;
}

export const agreementCoverHeading = 'Comprehensive Service Level Agreement';
export const agreementCoverRed = '#ef3750';
export const agreementCoverBlue = '#1376c0';

const monthAndYear = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function coverDate(value: string) {
  const date = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime())) return value;
  const day = date.getUTCDate();
  const suffix = day >= 11 && day <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] ?? 'th');
  return `${day}${suffix} ${monthAndYear.format(date)}`;
}

export function agreementCoverText(details?: AgreementCoverDetails | null) {
  return {
    subtitle: details ? `For ${details.title.replace(/^for\s+/i, '')}` : '',
    period: details ? `${coverDate(details.startDate)} to ${coverDate(details.endDate)}` : '',
  };
}

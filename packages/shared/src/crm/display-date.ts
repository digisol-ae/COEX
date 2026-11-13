/** Formats a calendar date without shifting it across time zones. */
export function displayDate(value: string) {
  return value.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3-$2-$1');
}

export function displayTimestamp(value: string | Date, timeZone = 'UTC') {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get('day')}-${get('month')}-${get('year')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

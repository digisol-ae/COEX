/** Office dates must not depend on the host's timezone or UTC calendar date. */
export function officeDate(now = new Date(), timeZone = process.env.OFFICE_TZ ?? 'Asia/Dubai') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function officeInstant(
  workDate: string,
  hour: number,
  minute: number,
  second: number,
  timeZone = process.env.OFFICE_TZ ?? 'Asia/Dubai',
) {
  const wallTime = Date.parse(
    workDate + 'T' + [hour, minute, second].map((n) => String(n).padStart(2, '0')).join(':') + 'Z',
  );
  let instant = wallTime;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  // Recompute the offset at the target instant, including daylight-saving changes.
  for (let i = 0; i < 4; i += 1) {
    const parts = formatter.formatToParts(new Date(instant));
    const get = (type: string) => parts.find((part) => part.type === type)!.value;
    const observed = Date.parse(
      get('year') +
        '-' +
        get('month') +
        '-' +
        get('day') +
        'T' +
        get('hour') +
        ':' +
        get('minute') +
        ':' +
        get('second') +
        'Z',
    );
    const correction = wallTime - observed;
    if (correction === 0) break;
    instant += correction;
  }
  return new Date(instant);
}

export function nextOfficeDate(workDate: string) {
  return new Date(Date.parse(workDate + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10);
}

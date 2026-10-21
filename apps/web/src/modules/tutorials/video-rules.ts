/** Only a single valid byte range is supported; return null for a 416 response. */
export function videoRange(header: string, length: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || length < 1) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, length - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), length - 1) : length - 1;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start <= end && start < length
    ? { start, end }
    : null;
}

/**
 * Helpers for the planned window.
 *
 * A datetime input wants 2026-09-21T09:00 in local time, and JavaScript's toISOString gives UTC,
 * so a task planned for nine in the morning in Dubai shows as five if you use the obvious method.
 * Every conversion goes through here.
 */

export function toDateTimeInput(value: Date | string | null | undefined): string {
  if (!value) return '';

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';

  const pad = (part: number) => String(part).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** Short form for lists: 21 Sep 09:00, with the year only when it is not this one. */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return '';

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';

  const sameYear = date.getFullYear() === new Date().getFullYear();

  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

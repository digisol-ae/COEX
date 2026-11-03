export const TASK_RECURRENCES = ['none', 'daily', 'weekly', 'monthly', 'yearly'] as const;
export type TaskRecurrence = (typeof TASK_RECURRENCES)[number];

/** Advance one planned date, preserving its time and clamping month/year ends. */
export function nextRecurrenceDate(
  value: Date | null | undefined,
  recurrence: TaskRecurrence,
): Date | null {
  if (!value || recurrence === 'none') return value ?? null;
  const next = new Date(value);

  if (recurrence === 'daily' || recurrence === 'weekly') {
    next.setUTCDate(next.getUTCDate() + (recurrence === 'daily' ? 1 : 7));
    return next;
  }

  const month = value.getUTCMonth() + (recurrence === 'monthly' ? 1 : 0);
  const year = value.getUTCFullYear() + (recurrence === 'yearly' ? 1 : 0);
  const targetMonth = ((month % 12) + 12) % 12;
  const targetYear = year + Math.floor(month / 12);
  const day = Math.min(
    value.getUTCDate(),
    new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate(),
  );
  next.setUTCDate(1);
  next.setUTCFullYear(targetYear, targetMonth, day);
  return next;
}

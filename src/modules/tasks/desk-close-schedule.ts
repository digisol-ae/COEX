import { nextOfficeDate, officeDate, officeInstant } from './office-day';

/** A failed close keeps its original date, including when a retry crosses midnight. */
export function createDeskCloseSchedule(
  close: (at: Date) => Promise<void>,
  startedAt = new Date(),
  timeZone = process.env.OFFICE_TZ ?? 'Asia/Dubai',
) {
  let workDate = officeDate(startedAt, timeZone);
  let closeAt = officeInstant(workDate, 23, 59, 59, timeZone);
  let attemptAt = closeAt.getTime();
  let running = false;

  return {
    delay(now = new Date()) {
      return Math.max(0, Math.min(30000, attemptAt - now.getTime()));
    },
    async tick(now = new Date()) {
      if (running || now.getTime() < attemptAt) return;
      running = true;
      try {
        await close(new Date(closeAt));
        workDate = nextOfficeDate(workDate);
        closeAt = officeInstant(workDate, 23, 59, 59, timeZone);
        attemptAt = closeAt.getTime();
      } catch (error) {
        attemptAt = now.getTime() + 30000;
        throw error;
      } finally {
        running = false;
      }
    },
  };
}

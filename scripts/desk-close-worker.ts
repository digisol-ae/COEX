import { closeOfficeDay } from '../src/modules/tasks/services/desk-close.service';
import { createDeskCloseSchedule } from '../src/modules/tasks/desk-close-schedule';
import { officeDate } from '../src/modules/tasks/office-day';

const OFFICE_TZ = process.env.OFFICE_TZ ?? 'Asia/Dubai';
function log(message: string) { console.log(new Date().toISOString() + ' ' + message); }

const schedule = createDeskCloseSchedule(async (at) => {
  const { users, failures } = await closeOfficeDay(at);
  if (failures.length) {
    throw new Error(failures.map(f => f.userId + ': ' + f.message).join('; '));
  }
  log('office-day close ' + officeDate(at, OFFICE_TZ) + ': archived desks for ' + users + ' user(s).');
}, new Date(), OFFICE_TZ);

let stopping = false;
let timer: ReturnType<typeof setTimeout>;
async function tick() {
  try {
    await schedule.tick();
  } catch (error) {
    log('office-day close failed; retrying in 30 seconds: ' +
      (error instanceof Error ? error.message : String(error)));
  } finally {
    if (!stopping) timer = setTimeout(() => void tick(), schedule.delay());
  }
}
log('COEX desk-close worker starting (office tz ' + OFFICE_TZ + ').');
void tick();
const shutdown = () => {
  stopping = true;
  clearTimeout(timer);
  log('COEX desk-close worker stopping.');
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

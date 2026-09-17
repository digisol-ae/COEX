import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { TenantModel } from '@/modules/core/models/tenant.model';
import { createPortfolio, createProject } from '@/modules/tasks/services/portfolio.service';
import { createTask } from '@/modules/tasks/services/task.service';
import {
  addManualEntry,
  getRunningTimer,
  startTimer,
  stopTimer,
} from '@/modules/time/services/time.service';
import {
  loadTimesheet,
  loadTotals,
  lockWeek,
  unlockWeek,
} from '@/modules/time/services/timesheet.service';
import { endOfWeek, startOfWeek } from '@/modules/time/week';

const tenantId = new Types.ObjectId();
const userId = new Types.ObjectId();
const otherUserId = new Types.ObjectId();

const context = { tenantId, userId, isPlatformAdmin: false };
const otherPerson = { tenantId, userId: otherUserId, isPlatformAdmin: false };

const today = new Date().toISOString().slice(0, 10);

async function aTask(title = 'A task'): Promise<string> {
  const portfolioId = await runWithContext(context, () => createPortfolio({ name: 'Support' }));
  const projectId = await runWithContext(context, () =>
    createProject({ portfolioId, name: 'Implementation' }),
  );

  return runWithContext(context, () => createTask({ projectId, title }));
}

beforeAll(async () => {
  await connectForTests('time');
});

afterAll(async () => {
  await disconnectFromTests();
});

beforeEach(async () => {
  await clearDatabase();
  await TenantModel.create({ _id: tenantId, name: 'DigiSol', slug: 'digisol' });
});

describe('the timer', () => {
  it('starts, reports itself and stops with at least a minute recorded', async () => {
    const taskId = await aTask();

    await runWithContext(context, () => startTimer(taskId));

    const running = await runWithContext(context, () => getRunningTimer());
    expect(running?.taskId).toBe(taskId);

    await runWithContext(context, () => stopTimer());

    const stopped = await runWithContext(context, () => getRunningTimer());
    expect(stopped).toBeNull();

    const sheet = await runWithContext(context, () => loadTimesheet(new Date()));
    expect(sheet.entries).toHaveLength(1);
    expect(sheet.entries[0].minutes).toBeGreaterThanOrEqual(1);
  });

  it('starting a second timer stops the first, because that is what the person means', async () => {
    const first = await aTask('First');
    const second = await aTask('Second');

    await runWithContext(context, () => startTimer(first));
    await runWithContext(context, () => startTimer(second));

    const running = await runWithContext(context, () => getRunningTimer());
    expect(running?.taskId).toBe(second);

    const sheet = await runWithContext(context, () => loadTimesheet(new Date()));
    expect(sheet.entries.filter((entry) => entry.running)).toHaveLength(1);
  });

  it('keeps one person timer separate from another', async () => {
    const taskId = await aTask();

    await runWithContext(context, () => startTimer(taskId));
    await runWithContext(otherPerson, () => startTimer(taskId));

    const mine = await runWithContext(context, () => getRunningTimer());
    const theirs = await runWithContext(otherPerson, () => getRunningTimer());

    expect(mine).not.toBeNull();
    expect(theirs).not.toBeNull();
    expect(mine?.entryId).not.toBe(theirs?.entryId);
  });
});

describe('manual entries', () => {
  it('records time and totals it, separating billable from the rest', async () => {
    const taskId = await aTask();

    await runWithContext(context, async () => {
      await addManualEntry({ taskId, workDate: today, duration: 90, note: 'Migration run' });
      await addManualEntry({ taskId, workDate: today, duration: 30, billable: false });
    });

    const sheet = await runWithContext(context, () => loadTimesheet(new Date()));

    expect(sheet.totalMinutes).toBe(120);
    expect(sheet.billableMinutes).toBe(90);
  });

  it('refuses an entry with no duration', async () => {
    const taskId = await aTask();

    await expect(
      runWithContext(context, () => addManualEntry({ taskId, workDate: today, duration: 0 })),
    ).rejects.toThrow(/how long/);
  });
});

describe('the weekly lock', () => {
  it('refuses new time in a locked week and allows it again after an unlock', async () => {
    const taskId = await aTask();

    await runWithContext(context, () => addManualEntry({ taskId, workDate: today, duration: 60 }));
    await runWithContext(context, () => lockWeek(new Date()));

    await expect(
      runWithContext(context, () => addManualEntry({ taskId, workDate: today, duration: 30 })),
    ).rejects.toThrow(/locked/);

    await runWithContext(context, () => unlockWeek(new Date(), 'Correcting Thursday'));

    await expect(
      runWithContext(context, () => addManualEntry({ taskId, workDate: today, duration: 30 })),
    ).resolves.not.toThrow();
  });

  it('demands a reason for unlocking, because the reason is the point', async () => {
    await runWithContext(context, () => lockWeek(new Date()));

    await expect(runWithContext(context, () => unlockWeek(new Date(), '  '))).rejects.toThrow(
      /reason/,
    );
  });
});

describe('totals', () => {
  it('groups by person and by project for the period', async () => {
    const taskId = await aTask();

    await runWithContext(context, () => addManualEntry({ taskId, workDate: today, duration: 60 }));
    await runWithContext(otherPerson, () =>
      addManualEntry({ taskId, workDate: today, duration: 120, billable: false }),
    );

    const totals = await runWithContext(context, () =>
      loadTotals(startOfWeek(new Date()), endOfWeek(new Date())),
    );

    expect(totals.totalMinutes).toBe(180);
    expect(totals.billableMinutes).toBe(60);
    expect(totals.byPerson).toHaveLength(2);
    expect(totals.byProject).toHaveLength(1);
  });
});

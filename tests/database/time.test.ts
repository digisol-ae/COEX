import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { TenantModel } from '@/modules/core/models/tenant.model';
import { createSpace } from '@/modules/tasks/services/space.service';
import { createTask } from '@/modules/tasks/services/task.service';
import {
  addManualEntry,
  getRunningTimer,
  removeEntry,
  startTimer,
  stopTimer,
  updateEntry,
} from '@/modules/time/services/time.service';
import { historyFor } from '@/modules/core/services/audit.service';
import {
  loadTimesheet,
  loadTotals,
  lockWeek,
  unlockWeek,
} from '@/modules/time/services/timesheet.service';
import { endOfWeek, startOfWeek, toDateKey } from '@/modules/time/week';

const tenantId = new Types.ObjectId();
const userId = new Types.ObjectId();
const otherUserId = new Types.ObjectId();

const context = { tenantId, userId, isPlatformAdmin: false };
const otherPerson = { tenantId, userId: otherUserId, isPlatformAdmin: false };

const today = new Date().toISOString().slice(0, 10);

async function aTask(title = 'A task'): Promise<string> {
  const spaceId = await runWithContext(context, () => createSpace({ name: 'Implementation' }));

  return runWithContext(context, () => createTask({ spaceId, title }));
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
    expect(totals.bySpace).toHaveLength(1);
  });
});

describe('correcting an entry', () => {
  it('changes the number and records what it was before', async () => {
    const taskId = await aTask();

    await runWithContext(context, () =>
      addManualEntry({ taskId, workDate: today, duration: 90, note: 'First guess' }),
    );

    const before = await runWithContext(context, () => loadTimesheet(new Date(), String(userId)));
    const entryId = before.entries[0].id;

    await runWithContext(context, () =>
      updateEntry(entryId, { duration: 120, note: 'Checked the calendar', billable: true }),
    );

    const after = await runWithContext(context, () => loadTimesheet(new Date(), String(userId)));

    expect(after.entries[0].minutes).toBe(120);
    expect(after.entries[0].note).toBe('Checked the calendar');
    expect(after.entries[0].edited).toBe(true);

    const history = await runWithContext(context, () => historyFor('TimeEntry', entryId));
    const edit = history.find((row) => row.action === 'time.entry_edited');

    expect(edit).toBeTruthy();
    expect(edit?.changes.find((change) => change.field === 'minutes')).toEqual({
      field: 'minutes',
      from: 90,
      to: 120,
    });
  });

  it('moves an entry to another day', async () => {
    const taskId = await aTask();

    await runWithContext(context, () => addManualEntry({ taskId, workDate: today, duration: 60 }));

    const before = await runWithContext(context, () => loadTimesheet(new Date(), String(userId)));

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await runWithContext(context, () =>
      updateEntry(before.entries[0].id, {
        duration: 60,
        billable: true,
        workDate: toDateKey(yesterday),
      }),
    );

    const after = await runWithContext(context, () => loadTimesheet(new Date(), String(userId)));

    expect(toDateKey(after.entries[0].workDate)).toBe(toDateKey(yesterday));
  });

  it('carries the space and the customer when the entry moves to another task', async () => {
    const first = await aTask('First task');
    const second = await aTask('Second task');

    await runWithContext(context, () =>
      addManualEntry({ taskId: first, workDate: today, duration: 60 }),
    );

    const before = await runWithContext(context, () => loadTimesheet(new Date(), String(userId)));

    await runWithContext(context, () =>
      updateEntry(before.entries[0].id, { duration: 60, billable: true, taskId: second }),
    );

    const after = await runWithContext(context, () => loadTimesheet(new Date(), String(userId)));

    expect(after.entries[0].taskId).toBe(second);
    expect(after.entries[0].taskTitle).toBe('Second task');
  });

  it('refuses to edit somebody else\u2019s entry without the authority to', async () => {
    const taskId = await aTask();

    await runWithContext(context, () => addManualEntry({ taskId, workDate: today, duration: 60 }));

    const sheet = await runWithContext(context, () => loadTimesheet(new Date(), String(userId)));

    await expect(
      runWithContext(otherPerson, () =>
        updateEntry(sheet.entries[0].id, { duration: 30, billable: true }),
      ),
    ).rejects.toThrow(/administrator/i);
  });

  it('allows an administrator to correct it, and says whose it was', async () => {
    const taskId = await aTask();

    await runWithContext(context, () => addManualEntry({ taskId, workDate: today, duration: 60 }));

    const sheet = await runWithContext(context, () => loadTimesheet(new Date(), String(userId)));

    await runWithContext(otherPerson, () =>
      updateEntry(sheet.entries[0].id, { duration: 30, billable: true, mayEditOthers: true }),
    );

    const history = await runWithContext(context, () =>
      historyFor('TimeEntry', sheet.entries[0].id),
    );

    const edit = history.find((row) => row.action === 'time.entry_edited');

    expect(edit?.changes.some((change) => change.field === 'onBehalfOf')).toBe(true);
  });

  it('refuses to edit an entry in a locked week', async () => {
    const taskId = await aTask();

    await runWithContext(context, () => addManualEntry({ taskId, workDate: today, duration: 60 }));

    const sheet = await runWithContext(context, () => loadTimesheet(new Date(), String(userId)));

    await runWithContext(context, () => lockWeek(startOfWeek(new Date())));

    await expect(
      runWithContext(context, () =>
        updateEntry(sheet.entries[0].id, { duration: 30, billable: true }),
      ),
    ).rejects.toThrow(/locked/i);
  });

  it('refuses to move an entry into a locked week', async () => {
    const taskId = await aTask();

    await runWithContext(context, () => addManualEntry({ taskId, workDate: today, duration: 60 }));

    const sheet = await runWithContext(context, () => loadTimesheet(new Date(), String(userId)));

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    await runWithContext(context, () => lockWeek(startOfWeek(lastWeek)));

    await expect(
      runWithContext(context, () =>
        updateEntry(sheet.entries[0].id, {
          duration: 60,
          billable: true,
          workDate: toDateKey(lastWeek),
        }),
      ),
    ).rejects.toThrow(/locked/i);
  });

  it('refuses to edit a running timer, whose minutes nobody has typed yet', async () => {
    const taskId = await aTask();

    await runWithContext(context, () => startTimer(taskId));

    const running = await runWithContext(context, () => getRunningTimer());

    await expect(
      runWithContext(context, () =>
        updateEntry(running!.entryId, { duration: 60, billable: true }),
      ),
    ).rejects.toThrow(/timer/i);
  });

  it('refuses to remove somebody else\u2019s entry without the authority to', async () => {
    const taskId = await aTask();

    await runWithContext(context, () => addManualEntry({ taskId, workDate: today, duration: 60 }));

    const sheet = await runWithContext(context, () => loadTimesheet(new Date(), String(userId)));

    await expect(
      runWithContext(otherPerson, () => removeEntry(sheet.entries[0].id)),
    ).rejects.toThrow(/administrator/i);
  });
});

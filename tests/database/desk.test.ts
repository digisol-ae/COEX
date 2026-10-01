import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { TenantModel } from '@/modules/core/models/tenant.model';
import { UserModel } from '@/modules/core/models/user.model';
import { createSpace, getSpace, updateSpace } from '@/modules/tasks/services/space.service';
import { createTask, getTask, moveTask } from '@/modules/tasks/services/task.service';
import {
  finishMyDesk,
  listDeskTaskIds,
  listMyDeskHistory,
  listTeamDeskHistory,
  setDeskTaskSelected,
} from '@/modules/tasks/services/desk.service';
import { closeOfficeDay } from '@/modules/tasks/services/desk-close.service';
import { DeskSnapshotModel } from '@/modules/tasks/models/desk-snapshot.model';
const tenantId = new Types.ObjectId(),
  userId = new Types.ObjectId(),
  otherId = new Types.ObjectId();
const context = { tenantId, userId, isPlatformAdmin: false };
const other = { tenantId, userId: otherId, isPlatformAdmin: false };
const asMe = <T>(work: () => Promise<T>) => runWithContext(context, work);
beforeAll(() => connectForTests('desk'));
afterAll(disconnectFromTests);
beforeEach(async () => {
  await clearDatabase();
  await TenantModel.create({ _id: tenantId, name: 'Desk QA', slug: 'desk-qa' });
  await UserModel.create([
    {
      _id: userId,
      tenantId,
      name: 'Desk owner',
      email: 'owner@coex.test',
      role: 'manager',
      status: 'active',
    },
    {
      _id: otherId,
      tenantId,
      name: 'Other owner',
      email: 'other@coex.test',
      role: 'agent',
      status: 'active',
    },
  ]);
});
async function task(title = 'My work', owner = userId) {
  const spaceId = await asMe(() => createSpace({ name: title }));
  const id = await asMe(() => createTask({ spaceId, title, assigneeIds: [String(owner)] }));
  return { id, spaceId };
}
describe('desk selection and daily history', () => {
  it('adds idempotently and refuses another owner’s task', async () => {
    const mine = await task(),
      theirs = await task('Their work', otherId);
    await asMe(() => setDeskTaskSelected(mine.id, true));
    await asMe(() => setDeskTaskSelected(mine.id, true));
    expect(await asMe(listDeskTaskIds)).toEqual([mine.id]);
    await expect(asMe(() => setDeskTaskSelected(theirs.id, true))).rejects.toThrow('assigned');
    expect(await runWithContext(other, listDeskTaskIds)).toEqual([]);
    await runWithContext(other, () => setDeskTaskSelected(mine.id, false));
    expect(await asMe(listDeskTaskIds)).toEqual([mine.id]);
  });
  it('accumulates completed tasks on repeated confirmations while incomplete tasks carry over', async () => {
    const first = await task('First'),
      second = await task('Second'),
      incomplete = await task('Carry over');
    for (const item of [first, second, incomplete])
      await asMe(() => setDeskTaskSelected(item.id, true));
    const at = new Date('2026-09-30T19:59:59Z');
    await asMe(() => moveTask(first.id, 'Done'));
    await asMe(() => finishMyDesk(at));
    expect(await asMe(listDeskTaskIds)).toEqual(expect.arrayContaining([second.id, incomplete.id]));
    await asMe(() => moveTask(second.id, 'Done'));
    await asMe(() => finishMyDesk(at));
    expect(await asMe(listDeskTaskIds)).toEqual([incomplete.id]);
    const history = await asMe(listMyDeskHistory);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ workDate: '2026-09-30', taskCount: 2 });
    expect(await runWithContext(other, () => listMyDeskHistory())).toEqual([]);
    expect((await closeOfficeDay(at)).failures).toEqual([]);
    expect((await asMe(listMyDeskHistory))[0].workDate).toBe('2026-09-30');
  });
  it('records confirmation using the office date after UTC evening', async () => {
    await asMe(() => finishMyDesk(new Date('2026-09-30T21:00:00Z')));
    expect((await asMe(listMyDeskHistory))[0].workDate).toBe('2026-10-01');
  });
});
describe('configured Space statuses', () => {
  it('keeps an Incomplete task on My Desk until its configured completed status is used', async () => {
    const spaceId = await asMe(() => createSpace({ name: 'Custom workflow' }));
    await asMe(() =>
      updateSpace(spaceId, {
        name: 'Custom workflow',
        statuses: [
          { name: 'Incomplete', isClosed: false },
          { name: 'Approved', isClosed: true },
        ],
      }),
    );
    const id = await asMe(() =>
      createTask({ spaceId, title: 'Needs review', assigneeIds: [String(userId)] }),
    );
    await asMe(() => setDeskTaskSelected(id, true));
    const at = new Date('2026-09-30T19:59:59Z');
    await asMe(() => finishMyDesk(at));
    expect(await asMe(listDeskTaskIds)).toEqual([id]);
    await asMe(() => moveTask(id, 'Approved'));
    await asMe(() => finishMyDesk(at));
    expect(await asMe(listDeskTaskIds)).toEqual([]);
    expect((await asMe(listMyDeskHistory))[0].taskCount).toBe(1);
  });

  it('creates and moves tasks in a custom stage while preserving existing task statuses', async () => {
    const original = await task();
    const statuses = [
      { name: 'To do', isClosed: false },
      { name: 'Review', isClosed: false },
      { name: 'Done', isClosed: true },
    ];
    await asMe(() => updateSpace(original.spaceId, { name: 'Workflow', statuses }));
    expect((await asMe(() => getSpace(original.spaceId)))?.statuses.map((s) => s.name)).toEqual([
      'To do',
      'Review',
      'Done',
    ]);
    await asMe(() => moveTask(original.id, 'Review'));
    expect((await asMe(() => getTask(original.id)))?.status).toBe('Review');
    await expect(
      asMe(() =>
        updateSpace(original.spaceId, { name: 'Workflow', statuses: [statuses[0], statuses[2]] }),
      ),
    ).rejects.toThrow('Move tasks');
    expect((await asMe(() => getTask(original.id)))?.status).toBe('Review');
  });
});

describe('team performance history', () => {
  async function snapshot(owner: Types.ObjectId, workDate: string, completedOnTime: number) {
    await DeskSnapshotModel.create({
      tenantId,
      userId: owner,
      workDate,
      score: 50,
      completedOnTime,
      overdue: 0,
      dueTomorrowNotStarted: 0,
      dueSoonInProgress: 0,
      taskIds: [],
    });
  }
  const grant = (grants: string[], denials: string[] = []) =>
    UserModel.updateOne(
      { _id: userId },
      { $set: { permissionGrants: grants, permissionDenials: denials } },
    );

  it('is refused to a manager who has not been granted it', async () => {
    await snapshot(otherId, '2026-09-30', 1);
    await expect(asMe(() => listTeamDeskHistory())).rejects.toThrow('permission');
  });

  it('is refused to a tenant administrator by role alone', async () => {
    await UserModel.updateOne({ _id: userId }, { $set: { role: 'tenant_admin' } });
    await expect(asMe(() => listTeamDeskHistory())).rejects.toThrow('permission');
  });

  it('shows everyone to a person granted it, filtered by person and date, without the score', async () => {
    await grant(['desk.read.all']);
    await snapshot(userId, '2026-09-29', 1);
    await snapshot(otherId, '2026-09-30', 2);
    await snapshot(otherId, '2026-09-01', 3);

    const everyone = await asMe(() =>
      listTeamDeskHistory({ from: '2026-09-15', to: '2026-09-30' }),
    );
    expect(everyone.map((row) => [row.workDate, row.userName])).toEqual([
      ['2026-09-30', 'Other owner'],
      ['2026-09-29', 'Desk owner'],
    ]);
    expect(everyone[0]).not.toHaveProperty('score');

    const one = await asMe(() => listTeamDeskHistory({ userId: String(otherId) }));
    expect(one.map((row) => row.completedOnTime)).toEqual([2, 3]);
  });

  it('is refused again once the permission is denied', async () => {
    await grant(['desk.read.all'], ['desk.read.all']);
    await expect(asMe(() => listTeamDeskHistory())).rejects.toThrow('permission');
  });
});

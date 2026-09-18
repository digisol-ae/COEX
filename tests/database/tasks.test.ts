import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { TenantModel } from '@/modules/core/models/tenant.model';
import { UserModel } from '@/modules/core/models/user.model';
import { createSpace } from '@/modules/tasks/services/space.service';
import { createFolder, updateFolder } from '@/modules/tasks/services/folder.service';
import {
  addDocumentLink,
  addSubtask,
  createTask,
  getTask,
  listTasks,
  moveTask,
  moveTaskToPosition,
  patchTask,
  countMyOpenTasks,
} from '@/modules/tasks/services/task.service';
import { loadDashboard } from '@/modules/tasks/services/dashboard.service';

const tenantId = new Types.ObjectId();
const otherTenantId = new Types.ObjectId();
const userId = new Types.ObjectId();
const strangerId = new Types.ObjectId();
const adminId = new Types.ObjectId();

const context = { tenantId, userId, isPlatformAdmin: false };
const otherContext = {
  tenantId: otherTenantId,
  userId: new Types.ObjectId(),
  isPlatformAdmin: false,
};

async function aSpace(scope = context): Promise<string> {
  return runWithContext(scope, () => createSpace({ name: 'Implementation' }));
}

beforeAll(async () => {
  await connectForTests('tasks');
});

afterAll(async () => {
  await disconnectFromTests();
});

beforeEach(async () => {
  await clearDatabase();

  await TenantModel.create({
    _id: tenantId,
    name: 'DigiSol',
    slug: 'digisol',
    numbering: { taskPrefix: 'DGS-T', ticketPrefix: 'DGS-S' },
  });

  // Three people, because folder visibility depends on who is asking: the member, someone who is
  // not, and an administrator who sees everything.
  await UserModel.create([
    {
      _id: userId,
      tenantId,
      name: 'Syed Ali',
      email: 'ali@example.com',
      role: 'manager',
      passwordHash: 'x',
      status: 'active',
    },
    {
      _id: strangerId,
      tenantId,
      name: 'Fatima Noor',
      email: 'fatima@example.com',
      role: 'agent',
      passwordHash: 'x',
      status: 'active',
    },
    {
      _id: adminId,
      tenantId,
      name: 'Admin',
      email: 'admin@example.com',
      role: 'tenant_admin',
      passwordHash: 'x',
      status: 'active',
    },
  ]);
});

describe('tasks', () => {
  it('numbers tasks in sequence using the tenant prefix, without reuse', async () => {
    const spaceId = await aSpace();

    const firstId = await runWithContext(context, () =>
      createTask({ spaceId, title: 'First task' }),
    );
    const secondId = await runWithContext(context, () =>
      createTask({ spaceId, title: 'Second task' }),
    );

    const first = await runWithContext(context, () => getTask(firstId));
    const second = await runWithContext(context, () => getTask(secondId));

    expect(first?.number).toBe('DGS-T-1');
    expect(second?.number).toBe('DGS-T-2');
  });

  it('never hands the same number to two tasks created at the same moment', async () => {
    const spaceId = await aSpace();

    const ids = await runWithContext(context, () =>
      Promise.all(
        Array.from({ length: 5 }, (_, index) =>
          createTask({ spaceId, title: `Task ${index + 1}` }),
        ),
      ),
    );

    const numbers = await runWithContext(context, async () =>
      Promise.all(ids.map(async (id) => (await getTask(id))?.number)),
    );

    expect(new Set(numbers).size).toBe(5);
    expect([...numbers].sort()).toEqual(
      ['DGS-T-1', 'DGS-T-2', 'DGS-T-3', 'DGS-T-4', 'DGS-T-5'].sort(),
    );
  });

  it('opens a task in the first column and closes it in the closed column', async () => {
    const spaceId = await aSpace();
    const id = await runWithContext(context, () => createTask({ spaceId, title: 'A task' }));

    const opened = await runWithContext(context, () => getTask(id));
    expect(opened?.status).toBe('To do');
    expect(opened?.isClosed).toBe(false);

    await runWithContext(context, () => moveTask(id, 'Done'));

    const closed = await runWithContext(context, () => getTask(id));
    expect(closed?.isClosed).toBe(true);
    expect(closed?.closedAt).not.toBeNull();
  });

  it('refuses a column the project does not have', async () => {
    const spaceId = await aSpace();
    const id = await runWithContext(context, () => createTask({ spaceId, title: 'A task' }));

    await expect(runWithContext(context, () => moveTask(id, 'Invented'))).rejects.toThrow(
      /does not exist/,
    );
  });

  it('keeps tasks inside their tenant', async () => {
    const spaceId = await aSpace();
    await runWithContext(context, () => createTask({ spaceId, title: 'Ours' }));

    const otherSpaceId = await aSpace(otherContext);
    await runWithContext(otherContext, () =>
      createTask({ spaceId: otherSpaceId, title: 'Theirs' }),
    );

    const ours = await runWithContext(context, () => listTasks());
    const theirs = await runWithContext(otherContext, () => listTasks());

    expect(ours.map((task) => task.title)).toEqual(['Ours']);
    expect(theirs.map((task) => task.title)).toEqual(['Theirs']);
  });

  it('counts subtasks and documents on the summary', async () => {
    const spaceId = await aSpace();
    const id = await runWithContext(context, () => createTask({ spaceId, title: 'A task' }));

    await runWithContext(context, async () => {
      await addSubtask(id, 'Prepare the environment');
      await addSubtask(id, 'Run the import');
      await addDocumentLink(id, 'https://digisol.sharepoint.com/sites/ops/plan.docx');
    });

    const [summary] = await runWithContext(context, () => listTasks());

    expect(summary.subtaskCount).toBe(2);
    expect(summary.subtasksDone).toBe(0);
    expect(summary.documentCount).toBe(1);
  });
});

describe('planned hours', () => {
  it('counts working hours between the start and the end, not elapsed time', async () => {
    const spaceId = await aSpace();

    // Monday 09:00 to Wednesday 18:00 is three working days of nine hours, not fifty seven hours.
    const id = await runWithContext(context, () =>
      createTask({
        spaceId,
        title: 'Scheduled',
        startAt: '2026-09-21T09:00:00',
        endAt: '2026-09-23T18:00:00',
      }),
    );

    const task = await runWithContext(context, () => getTask(id));

    expect(task?.plannedMinutes).toBe(27 * 60);
  });

  it('records nothing when only one end of the window is known', async () => {
    const spaceId = await aSpace();

    const id = await runWithContext(context, () =>
      createTask({ spaceId, title: 'Half planned', startAt: '2026-09-21T09:00:00' }),
    );

    const task = await runWithContext(context, () => getTask(id));

    expect(task?.plannedMinutes).toBeNull();
  });
});

describe('board ordering', () => {
  it('places a dragged task between its new neighbours', async () => {
    const spaceId = await aSpace();

    const ids = await runWithContext(context, async () => [
      await createTask({ spaceId, title: 'First' }),
      await createTask({ spaceId, title: 'Second' }),
      await createTask({ spaceId, title: 'Third' }),
    ]);

    // Drag the third card to the top of the same column.
    await runWithContext(context, () => moveTaskToPosition(ids[2], 'To do', null, ids[0]));

    const order = await runWithContext(context, () => listTasks({ spaceId }));

    expect(order.map((task) => task.title)).toEqual(['Third', 'First', 'Second']);
  });

  it('changes the column when a task is dragged into another one', async () => {
    const spaceId = await aSpace();
    const id = await runWithContext(context, () => createTask({ spaceId, title: 'Moving' }));

    await runWithContext(context, () => moveTaskToPosition(id, 'In progress', null, null));

    const task = await runWithContext(context, () => getTask(id));

    expect(task?.status).toBe('In progress');
  });
});

describe('dashboard counts', () => {
  it('counts open, overdue and unassigned work', async () => {
    const spaceId = await aSpace();

    await runWithContext(context, async () => {
      await createTask({
        spaceId,
        title: 'Overdue and unassigned',
        startAt: '2026-01-01T09:00:00',
        endAt: '2026-01-02T17:00:00',
      });
      await createTask({ spaceId, title: 'Assigned', assigneeIds: [String(userId)] });
      const done = await createTask({ spaceId, title: 'Finished' });
      await moveTask(done, 'Done');
    });

    const data = await runWithContext(context, () => loadDashboard({}));

    expect(data.tiles.open).toBe(2);
    expect(data.tiles.overdue).toBe(1);
    expect(data.tiles.unassigned).toBe(1);
  });

  it('shows an agent only their own work', async () => {
    const spaceId = await aSpace();

    await runWithContext(context, async () => {
      await createTask({ spaceId, title: 'Mine', assigneeIds: [String(userId)] });
      await createTask({ spaceId, title: 'Someone else' });
    });

    const data = await runWithContext(context, () =>
      loadDashboard({ onlyAssigneeId: String(userId) }),
    );

    expect(data.tiles.open).toBe(1);
  });
});

describe('editing one task field from a row', () => {
  it('changes only the field it is given', async () => {
    const spaceId = await aSpace();
    const folderId = await runWithContext(context, () =>
      createFolder({ spaceId, name: 'Discovery' }),
    );

    const id = await runWithContext(context, () =>
      createTask({
        spaceId,
        title: 'Write the migration',
        priority: 'low',
        assigneeIds: [String(userId)],
        folderId,
        estimateMinutes: 120,
      }),
    );

    await runWithContext(context, () => patchTask(id, { priority: 'urgent' }));

    const task = await runWithContext(context, () => getTask(id));

    expect(task?.priority).toBe('urgent');
    expect(task?.title).toBe('Write the migration');
    expect(String(task?.folderId)).toBe(folderId);
    expect(task?.estimateMinutes).toBe(120);
    expect(task?.assigneeIds.map(String)).toEqual([String(userId)]);
  });

  it('recomputes planned hours when only the end moves', async () => {
    const spaceId = await aSpace();

    const id = await runWithContext(context, () =>
      createTask({
        spaceId,
        title: 'Plan the week',
        startAt: '2026-01-05T09:00:00',
        endAt: '2026-01-05T17:00:00',
      }),
    );

    const before = await runWithContext(context, () => getTask(id));

    await runWithContext(context, () => patchTask(id, { endAt: '2026-01-06T17:00:00' }));

    const after = await runWithContext(context, () => getTask(id));

    expect(after?.startAt?.toISOString()).toBe(before?.startAt?.toISOString());
    expect(after?.plannedMinutes).toBeGreaterThan(before?.plannedMinutes ?? 0);
  });

  it('refuses an end that lands before the start already on the task', async () => {
    const spaceId = await aSpace();

    const id = await runWithContext(context, () =>
      createTask({
        spaceId,
        title: 'Backwards',
        startAt: '2026-01-05T09:00:00',
        endAt: '2026-01-07T17:00:00',
      }),
    );

    await expect(
      runWithContext(context, () => patchTask(id, { endAt: '2026-01-04T17:00:00' })),
    ).rejects.toThrow();
  });

  it('clears both dates when both are sent empty', async () => {
    const spaceId = await aSpace();

    const id = await runWithContext(context, () =>
      createTask({
        spaceId,
        title: 'Unschedule me',
        startAt: '2026-01-05T09:00:00',
        endAt: '2026-01-07T17:00:00',
      }),
    );

    await runWithContext(context, () => patchTask(id, { startAt: null, endAt: null }));

    const task = await runWithContext(context, () => getTask(id));

    expect(task?.startAt).toBeNull();
    expect(task?.endAt).toBeNull();
    expect(task?.plannedMinutes).toBeNull();
  });

  it('reports subtasks in the list so a row can open without another query', async () => {
    const spaceId = await aSpace();

    const id = await runWithContext(context, () => createTask({ spaceId, title: 'Has steps' }));

    await runWithContext(context, async () => {
      await addSubtask(id, 'First step');
      await addSubtask(id, 'Second step');
    });

    const [summary] = await runWithContext(context, () => listTasks({ spaceId }));

    expect(summary.subtasks.map((subtask) => subtask.title)).toEqual(['First step', 'Second step']);
    expect(summary.subtasks.every((subtask) => subtask.id.length > 0)).toBe(true);
    expect(summary.assigneeIds).toEqual([]);
  });
});

describe('adding a task straight into a column', () => {
  it('opens it in the column it was typed under, not the first one', async () => {
    const spaceId = await aSpace();

    const id = await runWithContext(context, () =>
      createTask({ spaceId, title: 'Typed under In progress', status: 'In progress' }),
    );

    const task = await runWithContext(context, () => getTask(id));

    expect(task?.status).toBe('In progress');
  });

  it('marks it closed when the column is a closed one, so the counts stay honest', async () => {
    const spaceId = await aSpace();

    const id = await runWithContext(context, () =>
      createTask({ spaceId, title: 'Typed under Done', status: 'Done' }),
    );

    const task = await runWithContext(context, () => getTask(id));

    expect(task?.isClosed).toBe(true);
  });

  it('refuses a column the project does not have', async () => {
    const spaceId = await aSpace();

    await expect(
      runWithContext(context, () => createTask({ spaceId, title: 'Nowhere', status: 'Imaginary' })),
    ).rejects.toThrow(/no column/i);
  });
});

describe('the badge on the rail', () => {
  it('counts only my own open work', async () => {
    const spaceId = await aSpace();

    await runWithContext(context, async () => {
      await createTask({ spaceId, title: 'Mine and open', assigneeIds: [String(userId)] });
      await createTask({ spaceId, title: 'Someone else' });

      const closed = await createTask({
        spaceId,
        title: 'Mine and done',
        assigneeIds: [String(userId)],
        status: 'Done',
      });

      expect(closed).toBeTruthy();
    });

    const count = await runWithContext(context, () => countMyOpenTasks(String(userId)));

    expect(count).toBe(1);
  });
});

describe('folders, and who can see what', () => {
  it('shows an open folder to everyone in the space', async () => {
    const spaceId = await aSpace();

    const folderId = await runWithContext(context, () =>
      createFolder({ spaceId, name: 'Delivery' }),
    );

    await runWithContext(context, () => createTask({ spaceId, folderId, title: 'Visible to all' }));

    const seen = await runWithContext(
      { tenantId, userId: strangerId, isPlatformAdmin: false },
      () => listTasks({ spaceId }),
    );

    expect(seen.map((task) => task.title)).toEqual(['Visible to all']);
  });

  it('hides a private folder from everyone who is not in it', async () => {
    const spaceId = await aSpace();

    const folderId = await runWithContext(context, () =>
      createFolder({ spaceId, name: 'Salary review', memberIds: [String(userId)] }),
    );

    await runWithContext(context, () => createTask({ spaceId, folderId, title: 'Private work' }));
    await runWithContext(context, () => createTask({ spaceId, title: 'Open work' }));

    const stranger = await runWithContext(
      { tenantId, userId: strangerId, isPlatformAdmin: false },
      () => listTasks({ spaceId }),
    );

    expect(stranger.map((task) => task.title)).toEqual(['Open work']);
  });

  it('still shows a private folder to its own members', async () => {
    const spaceId = await aSpace();

    const folderId = await runWithContext(context, () =>
      createFolder({ spaceId, name: 'Salary review', memberIds: [String(strangerId)] }),
    );

    await runWithContext(context, () => createTask({ spaceId, folderId, title: 'Private work' }));

    const member = await runWithContext(
      { tenantId, userId: strangerId, isPlatformAdmin: false },
      () => listTasks({ spaceId }),
    );

    expect(member.map((task) => task.title)).toEqual(['Private work']);
  });

  it('refuses to put work in a private folder on someone outside it', async () => {
    const spaceId = await aSpace();

    const folderId = await runWithContext(context, () =>
      createFolder({ spaceId, name: 'Salary review', memberIds: [String(userId)] }),
    );

    await expect(
      runWithContext(context, () =>
        createTask({
          spaceId,
          folderId,
          title: 'Assigned to an outsider',
          assigneeIds: [String(strangerId)],
        }),
      ),
    ).rejects.toThrow(/private/i);
  });

  it('refuses to close a folder around work its owners could no longer see', async () => {
    const spaceId = await aSpace();

    const folderId = await runWithContext(context, () =>
      createFolder({ spaceId, name: 'Delivery' }),
    );

    await runWithContext(context, () =>
      createTask({
        spaceId,
        folderId,
        title: 'Someone else is doing this',
        assigneeIds: [String(strangerId)],
      }),
    );

    await expect(
      runWithContext(context, () =>
        updateFolder(folderId, { name: 'Delivery', memberIds: [String(userId)] }),
      ),
    ).rejects.toThrow(/assigned to people outside/i);
  });

  it('shows a private folder to a tenant administrator, who has to be able to find things', async () => {
    const spaceId = await aSpace();

    const folderId = await runWithContext(context, () =>
      createFolder({ spaceId, name: 'Salary review', memberIds: [String(userId)] }),
    );

    await runWithContext(context, () => createTask({ spaceId, folderId, title: 'Private work' }));

    const admin = await runWithContext({ tenantId, userId: adminId, isPlatformAdmin: false }, () =>
      listTasks({ spaceId }),
    );

    expect(admin.map((task) => task.title)).toEqual(['Private work']);
  });

  it('leaves the work behind in the space when a folder is archived', async () => {
    const spaceId = await aSpace();

    const folderId = await runWithContext(context, () =>
      createFolder({ spaceId, name: 'Delivery' }),
    );

    await runWithContext(context, () => createTask({ spaceId, folderId, title: 'Still needed' }));

    const { archiveFolder } = await import('@/modules/tasks/services/folder.service');
    await runWithContext(context, () => archiveFolder(folderId));

    const remaining = await runWithContext(context, () => listTasks({ spaceId }));

    expect(remaining.map((task) => task.title)).toEqual(['Still needed']);
    expect(remaining[0].folderId).toBeNull();
  });
});

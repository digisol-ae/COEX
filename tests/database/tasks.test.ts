import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { TenantModel } from '@/modules/core/models/tenant.model';
import { createProject } from '@/modules/tasks/services/project.service';
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

const context = { tenantId, userId, isPlatformAdmin: false };
const otherContext = {
  tenantId: otherTenantId,
  userId: new Types.ObjectId(),
  isPlatformAdmin: false,
};

async function aProject(scope = context): Promise<string> {
  return runWithContext(scope, () =>
    createProject({ name: 'Implementation', phases: ['Discovery', 'Design'] }),
  );
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
});

describe('tasks', () => {
  it('numbers tasks in sequence using the tenant prefix, without reuse', async () => {
    const projectId = await aProject();

    const firstId = await runWithContext(context, () =>
      createTask({ projectId, title: 'First task' }),
    );
    const secondId = await runWithContext(context, () =>
      createTask({ projectId, title: 'Second task' }),
    );

    const first = await runWithContext(context, () => getTask(firstId));
    const second = await runWithContext(context, () => getTask(secondId));

    expect(first?.number).toBe('DGS-T-1');
    expect(second?.number).toBe('DGS-T-2');
  });

  it('never hands the same number to two tasks created at the same moment', async () => {
    const projectId = await aProject();

    const ids = await runWithContext(context, () =>
      Promise.all(
        Array.from({ length: 5 }, (_, index) =>
          createTask({ projectId, title: `Task ${index + 1}` }),
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
    const projectId = await aProject();
    const id = await runWithContext(context, () => createTask({ projectId, title: 'A task' }));

    const opened = await runWithContext(context, () => getTask(id));
    expect(opened?.status).toBe('To do');
    expect(opened?.isClosed).toBe(false);

    await runWithContext(context, () => moveTask(id, 'Done'));

    const closed = await runWithContext(context, () => getTask(id));
    expect(closed?.isClosed).toBe(true);
    expect(closed?.closedAt).not.toBeNull();
  });

  it('refuses a column the project does not have', async () => {
    const projectId = await aProject();
    const id = await runWithContext(context, () => createTask({ projectId, title: 'A task' }));

    await expect(runWithContext(context, () => moveTask(id, 'Invented'))).rejects.toThrow(
      /does not exist/,
    );
  });

  it('keeps tasks inside their tenant', async () => {
    const projectId = await aProject();
    await runWithContext(context, () => createTask({ projectId, title: 'Ours' }));

    const otherProjectId = await aProject(otherContext);
    await runWithContext(otherContext, () =>
      createTask({ projectId: otherProjectId, title: 'Theirs' }),
    );

    const ours = await runWithContext(context, () => listTasks());
    const theirs = await runWithContext(otherContext, () => listTasks());

    expect(ours.map((task) => task.title)).toEqual(['Ours']);
    expect(theirs.map((task) => task.title)).toEqual(['Theirs']);
  });

  it('counts subtasks and documents on the summary', async () => {
    const projectId = await aProject();
    const id = await runWithContext(context, () => createTask({ projectId, title: 'A task' }));

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
    const projectId = await aProject();

    // Monday 09:00 to Wednesday 18:00 is three working days of nine hours, not fifty seven hours.
    const id = await runWithContext(context, () =>
      createTask({
        projectId,
        title: 'Scheduled',
        startAt: '2026-09-21T09:00:00',
        endAt: '2026-09-23T18:00:00',
      }),
    );

    const task = await runWithContext(context, () => getTask(id));

    expect(task?.plannedMinutes).toBe(27 * 60);
  });

  it('records nothing when only one end of the window is known', async () => {
    const projectId = await aProject();

    const id = await runWithContext(context, () =>
      createTask({ projectId, title: 'Half planned', startAt: '2026-09-21T09:00:00' }),
    );

    const task = await runWithContext(context, () => getTask(id));

    expect(task?.plannedMinutes).toBeNull();
  });
});

describe('board ordering', () => {
  it('places a dragged task between its new neighbours', async () => {
    const projectId = await aProject();

    const ids = await runWithContext(context, async () => [
      await createTask({ projectId, title: 'First' }),
      await createTask({ projectId, title: 'Second' }),
      await createTask({ projectId, title: 'Third' }),
    ]);

    // Drag the third card to the top of the same column.
    await runWithContext(context, () => moveTaskToPosition(ids[2], 'To do', null, ids[0]));

    const order = await runWithContext(context, () => listTasks({ projectId }));

    expect(order.map((task) => task.title)).toEqual(['Third', 'First', 'Second']);
  });

  it('changes the column when a task is dragged into another one', async () => {
    const projectId = await aProject();
    const id = await runWithContext(context, () => createTask({ projectId, title: 'Moving' }));

    await runWithContext(context, () => moveTaskToPosition(id, 'In progress', null, null));

    const task = await runWithContext(context, () => getTask(id));

    expect(task?.status).toBe('In progress');
  });
});

describe('dashboard counts', () => {
  it('counts open, overdue and unassigned work', async () => {
    const projectId = await aProject();

    await runWithContext(context, async () => {
      await createTask({
        projectId,
        title: 'Overdue and unassigned',
        startAt: '2026-01-01T09:00:00',
        endAt: '2026-01-02T17:00:00',
      });
      await createTask({ projectId, title: 'Assigned', assigneeIds: [String(userId)] });
      const done = await createTask({ projectId, title: 'Finished' });
      await moveTask(done, 'Done');
    });

    const data = await runWithContext(context, () => loadDashboard({}));

    expect(data.tiles.open).toBe(2);
    expect(data.tiles.overdue).toBe(1);
    expect(data.tiles.unassigned).toBe(1);
  });

  it('shows an agent only their own work', async () => {
    const projectId = await aProject();

    await runWithContext(context, async () => {
      await createTask({ projectId, title: 'Mine', assigneeIds: [String(userId)] });
      await createTask({ projectId, title: 'Someone else' });
    });

    const data = await runWithContext(context, () =>
      loadDashboard({ onlyAssigneeId: String(userId) }),
    );

    expect(data.tiles.open).toBe(1);
  });
});

describe('editing one task field from a row', () => {
  it('changes only the field it is given', async () => {
    const projectId = await aProject();

    const id = await runWithContext(context, () =>
      createTask({
        projectId,
        title: 'Write the migration',
        priority: 'low',
        assigneeIds: [String(userId)],
        phase: 'Discovery',
        estimateMinutes: 120,
      }),
    );

    await runWithContext(context, () => patchTask(id, { priority: 'urgent' }));

    const task = await runWithContext(context, () => getTask(id));

    expect(task?.priority).toBe('urgent');
    expect(task?.title).toBe('Write the migration');
    expect(task?.phase).toBe('Discovery');
    expect(task?.estimateMinutes).toBe(120);
    expect(task?.assigneeIds.map(String)).toEqual([String(userId)]);
  });

  it('recomputes planned hours when only the end moves', async () => {
    const projectId = await aProject();

    const id = await runWithContext(context, () =>
      createTask({
        projectId,
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
    const projectId = await aProject();

    const id = await runWithContext(context, () =>
      createTask({
        projectId,
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
    const projectId = await aProject();

    const id = await runWithContext(context, () =>
      createTask({
        projectId,
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
    const projectId = await aProject();

    const id = await runWithContext(context, () => createTask({ projectId, title: 'Has steps' }));

    await runWithContext(context, async () => {
      await addSubtask(id, 'First step');
      await addSubtask(id, 'Second step');
    });

    const [summary] = await runWithContext(context, () => listTasks({ projectId }));

    expect(summary.subtasks.map((subtask) => subtask.title)).toEqual(['First step', 'Second step']);
    expect(summary.subtasks.every((subtask) => subtask.id.length > 0)).toBe(true);
    expect(summary.assigneeIds).toEqual([]);
  });
});

describe('adding a task straight into a column', () => {
  it('opens it in the column it was typed under, not the first one', async () => {
    const projectId = await aProject();

    const id = await runWithContext(context, () =>
      createTask({ projectId, title: 'Typed under In progress', status: 'In progress' }),
    );

    const task = await runWithContext(context, () => getTask(id));

    expect(task?.status).toBe('In progress');
  });

  it('marks it closed when the column is a closed one, so the counts stay honest', async () => {
    const projectId = await aProject();

    const id = await runWithContext(context, () =>
      createTask({ projectId, title: 'Typed under Done', status: 'Done' }),
    );

    const task = await runWithContext(context, () => getTask(id));

    expect(task?.isClosed).toBe(true);
  });

  it('refuses a column the project does not have', async () => {
    const projectId = await aProject();

    await expect(
      runWithContext(context, () =>
        createTask({ projectId, title: 'Nowhere', status: 'Imaginary' }),
      ),
    ).rejects.toThrow(/no column/i);
  });
});

describe('the badge on the rail', () => {
  it('counts only my own open work', async () => {
    const projectId = await aProject();

    await runWithContext(context, async () => {
      await createTask({ projectId, title: 'Mine and open', assigneeIds: [String(userId)] });
      await createTask({ projectId, title: 'Someone else' });

      const closed = await createTask({
        projectId,
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

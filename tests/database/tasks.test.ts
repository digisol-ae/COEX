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

describe('dashboard counts', () => {
  it('counts open, overdue and unassigned work', async () => {
    const projectId = await aProject();

    await runWithContext(context, async () => {
      await createTask({ projectId, title: 'Overdue and unassigned', dueDate: '2026-01-01' });
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

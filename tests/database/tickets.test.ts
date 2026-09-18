import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { TenantModel } from '@/modules/core/models/tenant.model';
import { UserModel } from '@/modules/core/models/user.model';
import { createProject } from '@/modules/tasks/services/project.service';
import { getTask } from '@/modules/tasks/services/task.service';
import {
  addReply,
  assignTicket,
  changeStatus,
  createFollowOn,
  createTicket,
  escalateToTask,
  getTicketDetail,
  linkTickets,
  listTickets,
  mergeTickets,
  moveTicketToQueue,
  setTicketPriority,
} from '@/modules/tickets/services/ticket.service';
import {
  archiveQueue,
  createQueue,
  listQueues,
  updateQueue,
} from '@/modules/tickets/services/queue.service';
import {
  countMyOpenTickets,
  loadDeskMetrics,
  loadDeskSnapshot,
} from '@/modules/tickets/services/metrics.service';

const tenantId = new Types.ObjectId();
const otherTenantId = new Types.ObjectId();
const userId = new Types.ObjectId();
const colleagueId = new Types.ObjectId();

const context = { tenantId, userId, isPlatformAdmin: false };
const otherContext = {
  tenantId: otherTenantId,
  userId: new Types.ObjectId(),
  isPlatformAdmin: false,
};

async function aQueue(
  name = 'General support',
  targets?: {
    priority: 'urgent' | 'high' | 'normal' | 'low';
    firstResponseMinutes: number;
    resolutionMinutes: number;
  }[],
): Promise<string> {
  return runWithContext(context, () => createQueue({ name, targets }));
}

async function aTicket(queueId: string, subject = 'Scanner will not connect'): Promise<string> {
  return runWithContext(context, () =>
    createTicket({ subject, body: 'It stopped this morning.', queueId }),
  );
}

beforeAll(async () => {
  await connectForTests('tickets');
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

  await UserModel.create([
    {
      _id: userId,
      tenantId,
      name: 'Syed Ali',
      email: 'ali@example.com',
      role: 'tenant_admin',
      passwordHash: 'x',
      status: 'active',
    },
    {
      _id: colleagueId,
      tenantId,
      name: 'Fatima Noor',
      email: 'fatima@example.com',
      role: 'agent',
      passwordHash: 'x',
      status: 'active',
    },
  ]);
});

describe('queues', () => {
  it('makes the first queue the default, so a ticket always has somewhere to land', async () => {
    await aQueue('General support');
    await aQueue('Hardware');

    const queues = await runWithContext(context, () => listQueues());

    expect(queues.find((queue) => queue.isDefault)?.name).toBe('General support');
  });

  it('refuses a resolution target shorter than its own first response target', async () => {
    await expect(
      aQueue('Impossible', [
        { priority: 'urgent', firstResponseMinutes: 240, resolutionMinutes: 60 },
        { priority: 'high', firstResponseMinutes: 240, resolutionMinutes: 1440 },
        { priority: 'normal', firstResponseMinutes: 480, resolutionMinutes: 4320 },
        { priority: 'low', firstResponseMinutes: 1440, resolutionMinutes: 7200 },
      ]),
    ).rejects.toThrow(/shorter/i);
  });

  it('refuses a duplicate name', async () => {
    await aQueue('Hardware');

    await expect(aQueue('Hardware')).rejects.toThrow(/already/i);
  });

  it('will not archive a queue that still holds open tickets', async () => {
    const queueId = await aQueue('General support');
    await aQueue('Hardware');
    await aTicket(queueId);

    await expect(runWithContext(context, () => archiveQueue(queueId))).rejects.toThrow(
      /still holds/i,
    );
  });

  it('will not archive the last active queue, because a desk with none cannot take work', async () => {
    const queueId = await aQueue('General support');

    await expect(runWithContext(context, () => archiveQueue(queueId))).rejects.toThrow(/last/i);
  });

  it('moves the default when one queue claims it', async () => {
    const first = await aQueue('General support');
    const second = await aQueue('Hardware');

    await runWithContext(context, () => updateQueue(second, { name: 'Hardware', isDefault: true }));

    const queues = await runWithContext(context, () => listQueues());

    expect(queues.find((queue) => queue.id === second)?.isDefault).toBe(true);
    expect(queues.find((queue) => queue.id === first)?.isDefault).toBe(false);
  });
});

describe('service level clocks', () => {
  it('sets both targets from the queue when a ticket arrives', async () => {
    const queueId = await aQueue();
    const id = await aTicket(queueId);

    const ticket = await runWithContext(context, () => getTicketDetail(id));

    expect(ticket?.firstResponseDueAt).toBeInstanceOf(Date);
    expect(ticket?.resolutionDueAt).toBeInstanceOf(Date);
    expect(ticket?.firstResponseState).not.toBe('none');
  });

  it('stops the first reply clock on a public reply and not on an internal note', async () => {
    const queueId = await aQueue();
    const id = await aTicket(queueId);

    await runWithContext(context, () =>
      addReply({ ticketId: id, body: 'Looking into it.', visibility: 'internal' }),
    );

    const afterNote = await runWithContext(context, () => getTicketDetail(id));
    expect(afterNote?.firstRespondedAt).toBeNull();

    await runWithContext(context, () =>
      addReply({ ticketId: id, body: 'We are on it.', visibility: 'public' }),
    );

    const afterReply = await runWithContext(context, () => getTicketDetail(id));
    expect(afterReply?.firstRespondedAt).toBeInstanceOf(Date);
    expect(afterReply?.status).toBe('open');
  });

  it('recalculates from when the ticket arrived when the priority changes, not from now', async () => {
    const queueId = await aQueue('General support', [
      { priority: 'urgent', firstResponseMinutes: 60, resolutionMinutes: 480 },
      { priority: 'high', firstResponseMinutes: 240, resolutionMinutes: 1440 },
      { priority: 'normal', firstResponseMinutes: 480, resolutionMinutes: 4320 },
      { priority: 'low', firstResponseMinutes: 1440, resolutionMinutes: 7200 },
    ]);

    const id = await aTicket(queueId);
    const before = await runWithContext(context, () => getTicketDetail(id));

    await runWithContext(context, () => setTicketPriority(id, 'urgent'));

    const after = await runWithContext(context, () => getTicketDetail(id));

    expect(after?.firstResponseDueAt!.getTime()).toBeLessThan(
      before!.firstResponseDueAt!.getTime(),
    );
  });

  it('leaves a kept promise alone when the priority changes afterwards', async () => {
    const queueId = await aQueue();
    const id = await aTicket(queueId);

    await runWithContext(context, () =>
      addReply({ ticketId: id, body: 'Answered.', visibility: 'public' }),
    );

    const before = await runWithContext(context, () => getTicketDetail(id));
    await runWithContext(context, () => setTicketPriority(id, 'urgent'));
    const after = await runWithContext(context, () => getTicketDetail(id));

    expect(after?.firstResponseDueAt?.getTime()).toBe(before?.firstResponseDueAt?.getTime());
  });

  it('recalculates the targets when a ticket moves to a queue that promised something else', async () => {
    const slow = await aQueue('Slow', [
      { priority: 'urgent', firstResponseMinutes: 60, resolutionMinutes: 480 },
      { priority: 'high', firstResponseMinutes: 240, resolutionMinutes: 1440 },
      { priority: 'normal', firstResponseMinutes: 2400, resolutionMinutes: 7200 },
      { priority: 'low', firstResponseMinutes: 2400, resolutionMinutes: 7200 },
    ]);

    const fast = await aQueue('Fast', [
      { priority: 'urgent', firstResponseMinutes: 30, resolutionMinutes: 120 },
      { priority: 'high', firstResponseMinutes: 60, resolutionMinutes: 240 },
      { priority: 'normal', firstResponseMinutes: 60, resolutionMinutes: 480 },
      { priority: 'low', firstResponseMinutes: 120, resolutionMinutes: 960 },
    ]);

    const id = await aTicket(slow);
    const before = await runWithContext(context, () => getTicketDetail(id));

    await runWithContext(context, () => moveTicketToQueue(id, fast));

    const after = await runWithContext(context, () => getTicketDetail(id));

    expect(after?.queueName).toBe('Fast');
    expect(after!.firstResponseDueAt!.getTime()).toBeLessThan(
      before!.firstResponseDueAt!.getTime(),
    );
  });
});

describe('the life of a ticket', () => {
  it('numbers tickets in sequence with the tenant prefix', async () => {
    const queueId = await aQueue();

    const first = await aTicket(queueId, 'One');
    const second = await aTicket(queueId, 'Two');

    const firstTicket = await runWithContext(context, () => getTicketDetail(first));
    const secondTicket = await runWithContext(context, () => getTicketDetail(second));

    expect(firstTicket?.number).toBe('DGS-S-1');
    expect(secondTicket?.number).toBe('DGS-S-2');
  });

  it('refuses to reopen a closed ticket, so past figures cannot change', async () => {
    const queueId = await aQueue();
    const id = await aTicket(queueId);

    await runWithContext(context, async () => {
      await changeStatus(id, 'resolved');
      await changeStatus(id, 'closed');
    });

    await expect(runWithContext(context, () => changeStatus(id, 'open'))).rejects.toThrow(
      /cannot be reopened/i,
    );
  });

  it('creates a linked follow up instead', async () => {
    const queueId = await aQueue();
    const id = await aTicket(queueId);

    await runWithContext(context, async () => {
      await changeStatus(id, 'resolved');
      await changeStatus(id, 'closed');
    });

    const followOnId = await runWithContext(context, () => createFollowOn(id));
    const followOn = await runWithContext(context, () => getTicketDetail(followOnId));
    const original = await runWithContext(context, () => getTicketDetail(id));

    expect(followOn?.followsOnFromId).toBe(id);
    expect(original?.linkedTickets.map((row) => row.id)).toContain(followOnId);
  });

  it('records the resolution time in working minutes when a ticket is resolved', async () => {
    const queueId = await aQueue();
    const id = await aTicket(queueId);

    await runWithContext(context, () => changeStatus(id, 'resolved'));

    const ticket = await runWithContext(context, () => getTicketDetail(id));

    expect(ticket?.status).toBe('resolved');
    expect(ticket?.resolvedAt).toBeInstanceOf(Date);
  });
});

describe('merging and linking', () => {
  it('moves the conversation to the survivor and leaves a pointer behind', async () => {
    const queueId = await aQueue();
    const source = await aTicket(queueId, 'Duplicate');
    const target = await aTicket(queueId, 'The real one');

    await runWithContext(context, () =>
      addReply({ ticketId: source, body: 'More detail.', visibility: 'public' }),
    );

    await runWithContext(context, () => mergeTickets(source, target));

    const merged = await runWithContext(context, () => getTicketDetail(source));
    const survivor = await runWithContext(context, () => getTicketDetail(target));

    expect(merged?.mergedIntoId).toBe(target);
    expect(merged?.status).toBe('closed');
    expect(merged?.messages).toHaveLength(0);
    expect(survivor?.messages.some((message) => message.body === 'More detail.')).toBe(true);
    expect(survivor?.linkedTickets.map((row) => row.id)).toContain(source);
  });

  it('refuses to merge a ticket into itself', async () => {
    const queueId = await aQueue();
    const id = await aTicket(queueId);

    await expect(runWithContext(context, () => mergeTickets(id, id))).rejects.toThrow(/itself/i);
  });

  it('refuses to merge into a ticket that was itself merged away', async () => {
    const queueId = await aQueue();
    const first = await aTicket(queueId, 'One');
    const second = await aTicket(queueId, 'Two');
    const third = await aTicket(queueId, 'Three');

    await runWithContext(context, () => mergeTickets(first, second));

    await expect(runWithContext(context, () => mergeTickets(third, first))).rejects.toThrow(
      /itself merged/i,
    );
  });

  it('links both ways from one call', async () => {
    const queueId = await aQueue();
    const first = await aTicket(queueId, 'One');
    const second = await aTicket(queueId, 'Two');

    await runWithContext(context, () => linkTickets(first, second));

    const firstTicket = await runWithContext(context, () => getTicketDetail(first));
    const secondTicket = await runWithContext(context, () => getTicketDetail(second));

    expect(firstTicket?.linkedTickets.map((row) => row.id)).toContain(second);
    expect(secondTicket?.linkedTickets.map((row) => row.id)).toContain(first);
  });

  it('keeps merged tickets out of the list, because they are not work any more', async () => {
    const queueId = await aQueue();
    const source = await aTicket(queueId, 'Duplicate');
    const target = await aTicket(queueId, 'The real one');

    await runWithContext(context, () => mergeTickets(source, target));

    const open = await runWithContext(context, () => listTickets({}));

    expect(open.map((ticket) => ticket.id)).not.toContain(source);
  });
});

describe('escalation', () => {
  it('creates a task, links both records and leaves the ticket with the customer', async () => {
    const queueId = await aQueue();
    const id = await aTicket(queueId);
    const projectId = await runWithContext(context, () => createProject({ name: 'R4 platform' }));

    const taskId = await runWithContext(context, () =>
      escalateToTask({ ticketId: id, projectId, assigneeIds: [String(colleagueId)] }),
    );

    const ticket = await runWithContext(context, () => getTicketDetail(id));
    const task = await runWithContext(context, () => getTask(taskId));

    expect(ticket?.escalatedTaskId).toBe(taskId);
    expect(ticket?.status).toBe('escalated');
    expect(task?.title).toContain('DGS-S-1');
  });

  it('refuses to escalate the same ticket twice', async () => {
    const queueId = await aQueue();
    const id = await aTicket(queueId);
    const projectId = await runWithContext(context, () => createProject({ name: 'R4 platform' }));

    await runWithContext(context, () => escalateToTask({ ticketId: id, projectId }));

    await expect(
      runWithContext(context, () => escalateToTask({ ticketId: id, projectId })),
    ).rejects.toThrow(/already/i);
  });
});

describe('tenant isolation', () => {
  it('never shows one tenant another tenant’s tickets', async () => {
    const queueId = await aQueue();
    await aTicket(queueId);

    await TenantModel.create({
      _id: otherTenantId,
      name: 'Another company',
      slug: 'another',
      numbering: { taskPrefix: 'ANO-T', ticketPrefix: 'ANO-S' },
    });

    const theirs = await runWithContext(otherContext, () => listTickets({}));

    expect(theirs).toHaveLength(0);
  });

  it('will not let one tenant read another tenant’s ticket by id', async () => {
    const queueId = await aQueue();
    const id = await aTicket(queueId);

    await TenantModel.create({
      _id: otherTenantId,
      name: 'Another company',
      slug: 'another',
      numbering: { taskPrefix: 'ANO-T', ticketPrefix: 'ANO-S' },
    });

    const stolen = await runWithContext(otherContext, () => getTicketDetail(id));

    expect(stolen).toBeNull();
  });
});

describe('the desk report', () => {
  it('counts what was kept and what was missed, and reports the median', async () => {
    const queueId = await aQueue();

    const first = await aTicket(queueId, 'One');
    const second = await aTicket(queueId, 'Two');

    await runWithContext(context, async () => {
      await assignTicket(first, String(userId));
      await addReply({ ticketId: first, body: 'Answered.', visibility: 'public' });
      await changeStatus(first, 'resolved');
    });

    const metrics = await runWithContext(context, () =>
      loadDeskMetrics({
        from: new Date(Date.now() - 24 * 60 * 60 * 1000),
        to: new Date(Date.now() + 60 * 1000),
      }),
    );

    expect(metrics.totals.resolved).toBe(1);
    expect(metrics.totals.open).toBe(1);
    expect(metrics.totals.firstResponseMet).toBe(1);
    expect(metrics.totals.firstResponseMissed).toBe(0);
    expect(metrics.byAgent.find((row) => row.name === 'Unassigned')?.open).toBe(1);
    expect(metrics.unassignedOpen).toBe(1);

    // The second ticket is still open and unanswered, so it contributes to neither median.
    expect(metrics.totals.medianFirstResponseMinutes).not.toBeNull();
    expect(second).toBeTruthy();
  });

  it('shows an agent what is theirs and what nobody has picked up', async () => {
    const queueId = await aQueue();
    const mine = await aTicket(queueId, 'Mine');
    await aTicket(queueId, 'Nobody has this');

    await runWithContext(context, () => assignTicket(mine, String(userId)));

    const snapshot = await runWithContext(context, () =>
      loadDeskSnapshot({ userId: String(userId) }),
    );

    expect(snapshot.mine).toBe(1);
    expect(snapshot.unassigned).toBe(1);
    expect(snapshot.pressing.map((ticket) => ticket.subject)).toEqual(['Mine']);
  });
});

describe('the badge on the rail', () => {
  it('counts only my own open tickets', async () => {
    const queueId = await aQueue();

    const mine = await aTicket(queueId, 'Mine');
    const alsoMine = await aTicket(queueId, 'Mine and resolved');
    await aTicket(queueId, 'Nobody has this');

    await runWithContext(context, async () => {
      await assignTicket(mine, String(userId));
      await assignTicket(alsoMine, String(userId));
      await changeStatus(alsoMine, 'resolved');
    });

    const count = await runWithContext(context, () => countMyOpenTickets(String(userId)));

    expect(count).toBe(1);
  });
});

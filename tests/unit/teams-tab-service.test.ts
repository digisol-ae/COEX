import { beforeEach, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  users: vi.fn(),
  tenant: vi.fn(),
  list: vi.fn(),
  task: vi.fn(),
  comments: vi.fn(),
  comment: vi.fn(),
  done: vi.fn(),
  form: vi.fn(),
  reserve: vi.fn(),
  receipt: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  patch: vi.fn(),
  allowed: vi.fn(),
  running: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  addTime: vi.fn(),
  editTime: vi.fn(),
  entry: vi.fn(),
  entries: vi.fn(),
}));
vi.mock('@/modules/time/services/time.service', () => ({
  getRunningTimer: mocks.running,
  startTimer: mocks.start,
  stopTimer: mocks.stop,
  addManualEntry: mocks.addTime,
  updateEntry: mocks.editTime,
}));
vi.mock('@coex/shared/time/models/time-entry.model', () => ({
  TimeEntryModel: { findOne: mocks.entry, find: mocks.entries },
}));
vi.mock('@/lib/db', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/modules/integrations/teams/tab-auth', () => ({
  verifyTeamsTabToken: mocks.verify,
  COPILOT_CLIENT_IDS: ['ab3be6b7-f5df-413d-ac2d-abf1e3fd9c0b'],
}));
vi.mock('@coex/shared/core/models/user.model', () => ({ UserModel: { find: mocks.users } }));
vi.mock('@coex/shared/core/models/tenant.model', () => ({
  TenantModel: { findOne: mocks.tenant },
}));
vi.mock('@/modules/tasks/services/task.service', () => ({
  listTasks: mocks.list,
  getTask: mocks.task,
  listTaskComments: mocks.comments,
  addTaskComment: mocks.comment,
  setMySubtaskDone: mocks.done,
  createTask: mocks.create,
  patchTask: mocks.patch,
  assignableUserIdsForTask: mocks.allowed,
}));
vi.mock('@/modules/integrations/teams/teams.service', () => ({
  teamsConfig: () => ({
    tenantId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    appId: 'app',
    microsoftTenant: 'ms',
    secret: new TextEncoder().encode('x'.repeat(32)),
    url: 'https://coex.digisol.ae',
  }),
  loadTeamsForm: mocks.form,
}));
import mongoose from 'mongoose';
mongoose.models.TeamsTabReceipt = {
  create: mocks.reserve,
  findById: mocks.receipt,
  updateOne: mocks.update,
} as never;
const { readTeamsTab, writeTeamsTab } = await import('@/modules/integrations/teams/tab.service');
import { getContext } from '@/lib/tenant-context';
const actorId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const spaceId = 'cccccccccccccccccccccccc';
const taskId = 'dddddddddddddddddddddddd';
const create = {
  action: 'create',
  requestId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  fields: { title: 'Teams task', spaceId },
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.verify.mockResolvedValue('verified-oid');
  mocks.users.mockImplementation((query) =>
    query.entraObjectId
      ? {
          limit: vi.fn().mockResolvedValue([
            {
              _id: new Types.ObjectId(actorId),
              tenantId: new Types.ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
              role: 'tenant_admin',
            },
          ]),
        }
      : {
          sort: () => ({ select: async () => [{ _id: actorId, name: 'Agent' }] }),
          select: async () => (query._id?.$in ?? []).map((id: string) => ({ _id: id })),
        },
  );
  mocks.running.mockResolvedValue(null);
  mocks.entries.mockReturnValue({ sort: () => ({ limit: async () => [] }) });
  mocks.task.mockResolvedValue({ _id: taskId, assigneeIds: [actorId], spaceId, folderId: null });
  mocks.comments.mockResolvedValue([]);
  mocks.allowed.mockResolvedValue(null);
  mocks.tenant.mockResolvedValue({ modules: { tasks: true } });
  mocks.form.mockResolvedValue({
    actorId,
    spaces: [{ id: spaceId, name: 'Space', memberIds: [] }],
    folders: [],
    people: [{ id: actorId, name: 'Agent' }],
  });
  mocks.create.mockResolvedValue(taskId);
});
it('requires verified identity before database actor lookup', async () => {
  mocks.verify.mockRejectedValue(new Error());
  await expect(readTeamsTab('bad', { action: 'list' })).rejects.toMatchObject({ status: 401 });
  expect(mocks.users).not.toHaveBeenCalled();
});
it('maps only the configured tenant and verified oid, and scopes task reads', async () => {
  mocks.list.mockImplementation(async () => {
    expect(String(getContext().tenantId)).toBe('aaaaaaaaaaaaaaaaaaaaaaaa');
    expect(String(getContext().userId)).toBe(actorId);
    return [];
  });
  await readTeamsTab('token', { action: 'list', work: 'done' });
  expect(mocks.users).toHaveBeenCalledWith(
    expect.objectContaining({
      tenantId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      entraObjectId: 'verified-oid',
      status: 'active',
    }),
  );
  expect(mocks.list).toHaveBeenCalledWith({ assigneeId: actorId, personalWork: 'done' });
});
it('denies disabled tenants', async () => {
  mocks.tenant.mockResolvedValue(null);
  await expect(readTeamsTab('token', { action: 'list' })).rejects.toMatchObject({ status: 403 });
  expect(mocks.list).not.toHaveBeenCalled();
});
it('denies ambiguous linked identities', async () => {
  mocks.users.mockReturnValue({ limit: vi.fn().mockResolvedValue([{}, {}]) });
  await expect(readTeamsTab('token', { action: 'list' })).rejects.toMatchObject({ status: 403 });
});
it('does not reveal comments on inaccessible tasks', async () => {
  mocks.task.mockResolvedValue(null);
  await expect(readTeamsTab('token', { action: 'detail', taskId })).rejects.toMatchObject({
    status: 404,
  });
  expect(mocks.comments).not.toHaveBeenCalled();
});
it('returns friendly personal completion rules', async () => {
  mocks.done.mockRejectedValue(new Error('Complete your assigned subtasks first.'));
  await expect(
    writeTeamsTab('token', { action: 'personalDone', taskId, done: true }),
  ).rejects.toMatchObject({ status: 400, message: 'Complete your assigned subtasks first.' });
});
it('rejects hidden creation destinations before reserving or writing', async () => {
  await expect(
    writeTeamsTab('token', { ...create, fields: { title: 'No', spaceId: taskId } }),
  ).rejects.toMatchObject({ status: 403 });
  expect(mocks.reserve).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
});
it('defaults assignment to the verified creator', async () => {
  await expect(writeTeamsTab('token', create)).resolves.toEqual({ taskId });
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ assigneeIds: [actorId] }));
  expect(mocks.reserve).toHaveBeenCalledWith({
    _id: 'aaaaaaaaaaaaaaaaaaaaaaaa:bbbbbbbbbbbbbbbbbbbbbbbb:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  });
});
it('returns prior task on retry without creating again', async () => {
  mocks.reserve.mockRejectedValue({ code: 11000 });
  mocks.receipt.mockResolvedValue({ taskId });
  await expect(writeTeamsTab('token', create)).resolves.toEqual({ taskId });
  expect(mocks.create).not.toHaveBeenCalled();
});
it('does not retry an uncertain task write', async () => {
  mocks.reserve.mockRejectedValue({ code: 11000 });
  mocks.receipt.mockResolvedValue({ taskId: null });
  await expect(writeTeamsTab('token', create)).rejects.toMatchObject({ status: 409 });
  expect(mocks.create).not.toHaveBeenCalled();
});

function ordinary() {
  mocks.users.mockImplementation((query) =>
    query.entraObjectId
      ? {
          limit: async () => [
            {
              _id: new Types.ObjectId(actorId),
              tenantId: new Types.ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
              role: 'agent',
            },
          ],
        }
      : { sort: () => ({ select: async () => [] }) },
  );
}
it('denies agent filters and direct detail access without elevated view permission', async () => {
  ordinary();
  await expect(readTeamsTab('token', { action: 'list', agents: taskId })).rejects.toMatchObject({
    status: 403,
  });
  mocks.task.mockResolvedValue({ _id: taskId, assigneeIds: [spaceId] });
  await expect(readTeamsTab('token', { action: 'detail', taskId })).rejects.toMatchObject({
    status: 404,
  });
  expect(mocks.comments).not.toHaveBeenCalled();
});
it('filters multiple agents through the existing privacy-scoped task service', async () => {
  await readTeamsTab('token', { action: 'list', agents: actorId + ',' + taskId });
  expect(mocks.list).toHaveBeenCalledWith({ assigneeIds: [actorId, taskId], personalWork: 'all' });
});
it('denies assignment and forged multi-agent creation without assignment permission', async () => {
  ordinary();
  await expect(
    writeTeamsTab('token', { action: 'assign', taskId, assigneeIds: [actorId, spaceId] }),
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    writeTeamsTab('token', { ...create, assigneeIds: [actorId, spaceId] }),
  ).rejects.toMatchObject({ status: 403 });
  expect(mocks.patch).not.toHaveBeenCalled();
  expect(mocks.reserve).not.toHaveBeenCalled();
});
it('validates and deduplicates reassignment without replacing unrelated task fields', async () => {
  await writeTeamsTab('token', { action: 'assign', taskId, assigneeIds: [actorId, actorId] });
  expect(mocks.patch).toHaveBeenCalledWith(taskId, { assigneeIds: [actorId] });
  mocks.allowed.mockResolvedValue([]);
  await expect(
    writeTeamsTab('token', { action: 'assign', taskId, assigneeIds: [actorId] }),
  ).rejects.toMatchObject({ status: 403 });
});
it('keeps timer start/stop tied to the authenticated actor and never accepts an entry to stop', async () => {
  await writeTeamsTab('token', { action: 'timerStart', taskId, userId: spaceId });
  expect(mocks.start).toHaveBeenCalledWith(taskId);
  await writeTeamsTab('token', { action: 'timerStop', entryId: taskId, userId: spaceId });
  expect(mocks.stop).toHaveBeenCalledWith();
});
it('rejects another agent’s time entry even for elevated actors', async () => {
  mocks.entry.mockResolvedValue(null);
  await expect(
    writeTeamsTab('token', {
      action: 'timeEdit',
      taskId,
      entryId: spaceId,
      workDate: '2026-10-24',
      duration: 30,
      reason: 'Correction',
      mayEditOthers: true,
    }),
  ).rejects.toMatchObject({ status: 404 });
  expect(mocks.entry).toHaveBeenCalledWith(
    expect.objectContaining({ userId: expect.anything(), taskId }),
  );
  expect(mocks.editTime).not.toHaveBeenCalled();
});
it('edits own time with a reason and forces cross-user editing off', async () => {
  mocks.entry.mockResolvedValue({ _id: spaceId });
  await writeTeamsTab('token', {
    action: 'timeEdit',
    taskId,
    entryId: spaceId,
    workDate: '2026-10-24',
    duration: 30,
    reason: 'Correction',
    mayEditOthers: true,
  });
  expect(mocks.editTime).toHaveBeenCalledWith(
    spaceId,
    expect.objectContaining({ mayEditOthers: false, reason: 'Correction' }),
  );
  await expect(
    writeTeamsTab('token', {
      action: 'timeEdit',
      taskId,
      entryId: spaceId,
      workDate: '2026-10-24',
      duration: 30,
      reason: '',
    }),
  ).rejects.toMatchObject({ status: 400 });
});

it('honours selective grants and explicit denials independently', async () => {
  const configure = (permissionGrants: string[], permissionDenials: string[] = []) =>
    mocks.users.mockImplementation((query) =>
      query.entraObjectId
        ? {
            limit: async () => [
              {
                _id: new Types.ObjectId(actorId),
                tenantId: new Types.ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
                role: 'agent',
                permissionGrants,
                permissionDenials,
              },
            ],
          }
        : { sort: () => ({ select: async () => [] }), select: async () => [{ _id: actorId }] },
    );
  configure(['teams.tasks.read.others']);
  await readTeamsTab('token', { action: 'list', agents: spaceId });
  await expect(
    writeTeamsTab('token', { action: 'assign', taskId, assigneeIds: [actorId] }),
  ).rejects.toMatchObject({ status: 403 });
  configure(['teams.tasks.assign.others']);
  await writeTeamsTab('token', { action: 'assign', taskId, assigneeIds: [actorId] });
  await expect(readTeamsTab('token', { action: 'list', agents: spaceId })).rejects.toMatchObject({
    status: 403,
  });
  configure(['teams.tasks.read.others'], ['teams.tasks.read.others']);
  await expect(readTeamsTab('token', { action: 'list', agents: spaceId })).rejects.toMatchObject({
    status: 403,
  });
});
it('passes own manual time only and returns actionable locked-week errors', async () => {
  await writeTeamsTab('token', {
    action: 'timeAdd',
    taskId,
    workDate: '2026-10-24',
    duration: 45,
    userId: spaceId,
  });
  expect(mocks.addTime).toHaveBeenCalledWith(expect.not.objectContaining({ userId: spaceId }));
  mocks.addTime.mockRejectedValue(
    new Error('That week is locked, so the entry cannot be changed.'),
  );
  await expect(
    writeTeamsTab('token', { action: 'timeAdd', taskId, workDate: '2026-10-24', duration: 45 }),
  ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('locked') });
});
it('returns only own saved time when viewing another agent’s task', async () => {
  mocks.task.mockResolvedValue({ _id: taskId, assigneeIds: [spaceId], spaceId });
  await readTeamsTab('token', { action: 'detail', taskId });
  expect(mocks.entries).toHaveBeenCalledWith(
    expect.objectContaining({
      tenantId: new Types.ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
      userId: new Types.ObjectId(actorId),
      taskId,
    }),
  );
});

it('routes Copilot creation through current permission checks and existing receipt with visible source', async () => {
  await writeTeamsTab(
    'copilot-token',
    { ...create, fields: { ...create.fields, description: 'Task details' } },
    'copilot',
  );
  expect(mocks.verify).toHaveBeenCalledWith('copilot-token', expect.anything(), undefined, [
    'ab3be6b7-f5df-413d-ac2d-abf1e3fd9c0b',
  ]);
  expect(mocks.create).toHaveBeenCalledWith(
    expect.objectContaining({
      description: 'Task details\n\nCreated via Copilot',
      assigneeIds: [actorId],
    }),
  );
});

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
}));
vi.mock('@/lib/db', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/modules/integrations/teams/tab-auth', () => ({ verifyTeamsTabToken: mocks.verify }));
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
  mocks.users.mockReturnValue({
    limit: vi.fn().mockResolvedValue([
      {
        _id: new Types.ObjectId(actorId),
        tenantId: new Types.ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
        role: 'tenant_admin',
      },
    ]),
  });
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

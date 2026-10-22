import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  users: vi.fn(),
  tenant: vi.fn(),
  person: vi.fn(),
  space: vi.fn(),
  folder: vi.fn(),
  receipt: vi.fn(),
  reserve: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  canSpace: vi.fn(),
  canFolder: vi.fn(),
  allowed: vi.fn(),
}));
vi.mock('@/lib/db', () => ({ connectToDatabase: mocks.connect }));
vi.mock('@coex/shared/core/models/user.model', () => ({
  UserModel: { find: mocks.users, findOne: mocks.person },
}));
vi.mock('@coex/shared/core/models/tenant.model', () => ({
  TenantModel: { findOne: mocks.tenant },
}));
vi.mock('@coex/shared/tasks/models/space.model', () => ({ SpaceModel: { findOne: mocks.space } }));
vi.mock('@coex/shared/tasks/models/folder.model', () => ({
  FolderModel: { findOne: mocks.folder },
}));
vi.mock('@/modules/tasks/services/space.service', () => ({
  canOpenSpace: mocks.canSpace,
  visibleSpaceFilter: vi.fn(),
}));
vi.mock('@/modules/tasks/services/folder.service', () => ({
  canOpenFolder: mocks.canFolder,
  visibleFolderIds: vi.fn(),
}));
vi.mock('@/modules/tasks/services/task.service', () => ({
  createTask: mocks.create,
  assignableUserIdsForTask: mocks.allowed,
}));

import mongoose from 'mongoose';
// Reuse the existing-model hook so tests never connect to MongoDB.
mongoose.models.TeamsTaskReceipt = {
  findById: mocks.receipt,
  create: mocks.reserve,
  updateOne: mocks.update,
} as never;
const { handleTeamsActivity, loadTeamsForm } =
  await import('@/modules/integrations/teams/teams.service');
const { activitySchema, signDraft } = await import('@/modules/integrations/teams/teams-protocol');
const tenantId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const actorId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const spaceId = 'cccccccccccccccccccccccc';
const folderId = 'dddddddddddddddddddddddd';
const settings = {
  appId: 'bot',
  microsoftTenant: '22222222-2222-4222-8222-222222222222',
  tenantId,
  secret: new TextEncoder().encode('test-only-012345678901234567890123456'),
  url: 'https://coex.test',
};
let draft: string;
let actor: Record<string, unknown>;
async function invoke(data = {}) {
  return handleTeamsActivity(
    activitySchema.parse({
      type: 'invoke',
      name: 'composeExtension/submitAction',
      channelId: 'msteams',
      serviceUrl: 'https://smba.trafficmanager.net/emea/',
      from: { aadObjectId: '11111111-1111-4111-8111-111111111111' },
      channelData: { tenant: { id: settings.microsoftTenant } },
      value: {
        commandId: 'createCoexTask',
        data: { draft, title: 'Fix issue', destination: spaceId, ...data },
      },
    }),
    settings,
  );
}

beforeEach(async () => {
  vi.clearAllMocks();
  actor = {
    _id: new Types.ObjectId(actorId),
    tenantId: new Types.ObjectId(tenantId),
    role: 'tenant_admin',
    permissionGrants: [],
    permissionDenials: [],
  };
  mocks.users.mockImplementation(() => ({
    limit: async () => [actor],
    sort: () => ({ select: async () => [{ _id: actor._id, name: 'Eligible agent' }] }),
  }));
  mocks.tenant.mockResolvedValue({ modules: { tasks: true } });
  mocks.space.mockResolvedValue({ _id: spaceId });
  mocks.folder.mockResolvedValue({ _id: folderId });
  mocks.canSpace.mockResolvedValue(true);
  mocks.canFolder.mockResolvedValue(true);
  mocks.allowed.mockResolvedValue(null);
  mocks.person.mockResolvedValue({ _id: actorId });
  mocks.receipt.mockResolvedValue(null);
  mocks.reserve.mockResolvedValue({});
  mocks.create.mockResolvedValue('eeeeeeeeeeeeeeeeeeeeeeee');
  draft = await signDraft(
    {
      sub: actorId,
      tenant: tenantId,
      text: 'Original message',
      url: 'https://teams.microsoft.com/l/message/thread/1',
    },
    settings.secret,
  );
});

describe('Teams task access and duplicate protection', () => {
  it('rejects invalid form-loader tokens before accessing the database', async () => {
    await expect(loadTeamsForm('not-a-signed-token', settings)).rejects.toThrow();
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  it('rejects a signed form for another tenant before accessing the database', async () => {
    const foreign = await signDraft(
      {
        sub: actorId,
        tenant: 'ffffffffffffffffffffffff',
        text: 'private',
        url: 'https://teams.microsoft.com/l/message/x/1',
      },
      settings.secret,
    );
    await expect(loadTeamsForm(foreign, settings)).rejects.toThrow();
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  it('creates through the existing service with source provenance and reserves first', async () => {
    await invoke({ destination: `${spaceId}:${folderId}`, dueDate: '2026-10-22' });
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId,
        folderId,
        description: expect.stringContaining(
          'Original Teams message: https://teams.microsoft.com/',
        ),
        endAt: '2026-10-22T00:00',
      }),
    );
    expect(mocks.reserve.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.create.mock.invocationCallOrder[0],
    );
    expect(mocks.update).toHaveBeenCalled();
  });
  it('rejects a foreign Microsoft tenant before querying the database', async () => {
    const activity = activitySchema.parse({
      type: 'invoke',
      name: 'composeExtension/fetchTask',
      channelId: 'msteams',
      serviceUrl: 'https://smba.trafficmanager.net/emea/',
      from: { aadObjectId: '11111111-1111-4111-8111-111111111111' },
      channelData: { tenant: { id: '33333333-3333-4333-8333-333333333333' } },
      value: { commandId: 'createCoexTask' },
    });
    await handleTeamsActivity(activity, settings);
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  it.each(['client_contact', 'viewer'])(
    'refuses an account without staff task access: %s',
    async (role) => {
      actor.role = role;
      actor.permissionDenials = ['task.manage'];
      await invoke();
      expect(mocks.create).not.toHaveBeenCalled();
    },
  );
  it('requires exactly one active account in the configured COEX tenant', async () => {
    mocks.users.mockReturnValue({ limit: async () => [] });
    await invoke();
    expect(mocks.users).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId, status: 'active', deletedAt: null }),
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('rechecks revoked private-space access at submission', async () => {
    mocks.canSpace.mockResolvedValue(false);
    await invoke();
    expect(mocks.reserve).not.toHaveBeenCalled();
  });
  it('rejects a folder outside the selected space', async () => {
    mocks.folder.mockResolvedValue(null);
    await invoke({ destination: `${spaceId}:${folderId}` });
    expect(mocks.folder).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId, tenantId: actor.tenantId }),
    );
    expect(mocks.reserve).not.toHaveBeenCalled();
  });
  it('defaults assignment to the creator and accepts separate space/folder with time', async () => {
    await invoke({ spaceId, folderId, dueDate: '2026-10-22', dueTime: '09:30' });
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId,
        folderId,
        assigneeIds: [actorId],
        endAt: '2026-10-22T09:30',
      }),
    );
  });
  it('rejects an assignee who cannot access the destination', async () => {
    mocks.allowed.mockResolvedValue([]);
    await invoke({ assignee: actorId });
    expect(mocks.reserve).not.toHaveBeenCalled();
  });
  it('returns an existing task instead of creating twice', async () => {
    mocks.receipt.mockResolvedValue({ taskId: 'eeeeeeeeeeeeeeeeeeeeeeee' });
    expect(JSON.stringify(await invoke())).toContain('/tasks/eeeeeeeeeeeeeeeeeeeeeeee');
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('a concurrent reservation loss does not create a duplicate', async () => {
    mocks.reserve.mockRejectedValue({ code: 11000 });
    expect(JSON.stringify(await invoke())).toContain('being processed');
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('retains an uncertain reservation after a downstream failure', async () => {
    mocks.create.mockRejectedValue(new Error('downstream unavailable'));
    await expect(invoke()).rejects.toThrow('downstream unavailable');
    expect(mocks.reserve).toHaveBeenCalledOnce();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

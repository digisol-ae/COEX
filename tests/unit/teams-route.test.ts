import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ config: vi.fn(), verify: vi.fn(), handle: vi.fn() }));
vi.mock('@/modules/integrations/teams/teams.service', () => ({
  teamsConfig: mocks.config,
  handleTeamsActivity: mocks.handle,
}));
vi.mock('@/modules/integrations/teams/teams-protocol', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  verifyConnector: mocks.verify,
}));
import { POST } from '@/app/api/integrations/teams/messages/route';
const body = {
  type: 'invoke',
  name: 'composeExtension/fetchTask',
  channelId: 'msteams',
  serviceUrl: 'https://smba.trafficmanager.net/emea/',
  from: { aadObjectId: '11111111-1111-4111-8111-111111111111' },
  channelData: { tenant: { id: '22222222-2222-4222-8222-222222222222' } },
  value: { commandId: 'createCoexTask' },
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.config.mockReturnValue({ appId: 'bot' });
  mocks.verify.mockResolvedValue(undefined);
  mocks.handle.mockResolvedValue({ task: { type: 'message', value: 'Created' } });
});
const request = (data: string) =>
  new Request('https://coex.test/api/integrations/teams/messages', { method: 'POST', body: data });
describe('Teams invoke HTTP boundary', () => {
  it('stays disabled until configured', async () => {
    mocks.config.mockReturnValue(null);
    expect((await POST(request('{}'))).status).toBe(503);
    expect(mocks.handle).not.toHaveBeenCalled();
  });
  it('rejects oversized chunked requests without trusting Content-Length', async () => {
    expect((await POST(request('x'.repeat(128 * 1024 + 1)))).status).toBe(413);
    expect(mocks.verify).not.toHaveBeenCalled();
  });
  it('refuses invalid connector tokens before any business action', async () => {
    mocks.verify.mockRejectedValue(new Error('bad JWT'));
    expect((await POST(request(JSON.stringify(body)))).status).toBe(401);
    expect(mocks.handle).not.toHaveBeenCalled();
  });
  it('returns a private noncached invoke response', async () => {
    const result = await POST(request(JSON.stringify(body)));
    expect(result.status).toBe(200);
    expect(result.headers.get('cache-control')).toBe('no-store');
    expect(mocks.handle).toHaveBeenCalledOnce();
  });
  it('masks internal failures without claiming creation succeeded', async () => {
    mocks.handle.mockRejectedValue(new Error('secret database URI'));
    const result = await POST(request(JSON.stringify(body)));
    const text = await result.text();
    expect(text).not.toContain('secret database URI');
    expect(text).toContain('Check your task list');
  });
});

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ token: vi.fn() }));
vi.mock('@microsoft/teams-js', () => ({ authentication: { getAuthToken: mocks.token } }));
import { teamsTabRequest } from '@/modules/integrations/teams/tab-client';
const request = vi.fn();
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', request);
  mocks.token.mockResolvedValue('private-token');
  request.mockImplementation(async () => Response.json({ tasks: [] }));
});
afterEach(() => vi.unstubAllGlobals());
it('sends identity only in a header, omits cookies and acquires tokens per request', async () => {
  await teamsTabRequest('action=list');
  await teamsTabRequest('personalDone', { taskId: 'task', done: true });
  expect(mocks.token).toHaveBeenCalledTimes(2);
  expect(request.mock.calls[0][0]).toBe('/api/integrations/teams/app?action=list');
  expect(request.mock.calls[0][1]).toMatchObject({
    credentials: 'omit',
    cache: 'no-store',
    headers: { Authorization: 'Bearer private-token' },
  });
  expect(request.mock.calls[1][1].body).not.toContain('private-token');
});
it('explains SSO failures without raw Microsoft diagnostics', async () => {
  mocks.token.mockRejectedValue(new Error('AADSTS internal diagnostic'));
  await expect(teamsTabRequest('action=list')).rejects.toThrow(
    'Microsoft sign-in for COEX is unavailable.',
  );
  expect(request).not.toHaveBeenCalled();
});
it('surfaces safe API validation messages', async () => {
  request.mockResolvedValue(
    Response.json(
      { error: 'Choose an assignee who can access this destination.' },
      { status: 403 },
    ),
  );
  await expect(teamsTabRequest('create', {})).rejects.toThrow('Choose an assignee');
});

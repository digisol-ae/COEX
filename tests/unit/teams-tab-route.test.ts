import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock('@/modules/integrations/teams/tab.service', () => ({
  readTeamsTab: mocks.read,
  writeTeamsTab: mocks.write,
  TeamsTabError: class extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));
import { GET, POST } from '@/app/api/integrations/teams/app/route';
const url = 'https://coex.digisol.ae/api/integrations/teams/app?action=list';
beforeEach(() => vi.clearAllMocks());
it('rejects cookie-only calls without bearer identity', async () => {
  const response = await GET(new Request(url, { headers: { cookie: 'coex_session=test' } }));
  expect(response.status).toBe(401);
  expect(mocks.read).not.toHaveBeenCalled();
  expect(response.headers.get('cache-control')).toBe('no-store');
});
it('passes only explicit bearer identity and query to the service', async () => {
  mocks.read.mockResolvedValue({ tasks: [] });
  const response = await GET(new Request(url, { headers: { authorization: 'Bearer test' } }));
  expect(response.status).toBe(200);
  expect(mocks.read).toHaveBeenCalledWith('test', { action: 'list' });
});
it('bounds streamed write bodies', async () => {
  const response = await POST(
    new Request(url, {
      method: 'POST',
      headers: { authorization: 'Bearer test', 'content-type': 'application/json' },
      body: 'x'.repeat(32769),
    }),
  );
  expect(response.status).toBe(413);
  expect(mocks.write).not.toHaveBeenCalled();
});
it('returns a useful error for invalid JSON', async () => {
  const response = await POST(
    new Request(url, {
      method: 'POST',
      headers: { authorization: 'Bearer test', 'content-type': 'application/json' },
      body: '{',
    }),
  );
  expect(response.status).toBe(400);
});
it('does not leak internal exceptions', async () => {
  mocks.read.mockRejectedValue(new Error('mongodb secret stack'));
  const response = await GET(new Request(url, { headers: { authorization: 'Bearer test' } }));
  expect(response.status).toBe(500);
  expect(await response.text()).not.toContain('mongodb');
});

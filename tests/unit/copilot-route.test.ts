import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const calls = vi.hoisted(() => ({ options: vi.fn(), preview: vi.fn(), create: vi.fn() }));
vi.mock('@/modules/integrations/teams/copilot.service', () => ({
  copilotOptions: calls.options,
  copilotPrepare: calls.preview,
  copilotCreate: calls.create,
}));
vi.mock('@/modules/integrations/teams/tab.service', () => ({
  TeamsTabError: class extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));
import { GET, POST } from '@/app/api/integrations/copilot/[operation]/route';
const context = (operation: string) => ({ params: Promise.resolve({ operation }) });
const request = (body = '{}') =>
  new Request('https://example.com/api/integrations/copilot/create', {
    method: 'POST',
    headers: { authorization: 'Bearer signed-token', 'content-type': 'application/json' },
    body,
  });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('COEX_COPILOT_ENABLED', 'true');
});
afterEach(() => vi.unstubAllEnvs());
it('fails closed until explicitly enabled', async () => {
  vi.stubEnv('COEX_COPILOT_ENABLED', 'false');
  expect((await POST(request(), context('create'))).status).toBe(503);
  expect(calls.create).not.toHaveBeenCalled();
});
it('does not accept a browser session cookie in place of signed Microsoft identity', async () => {
  expect(
    (
      await GET(
        new Request('https://example.com', { headers: { cookie: 'coex-session=anything' } }),
        context('options'),
      )
    ).status,
  ).toBe(401);
  expect(calls.options).not.toHaveBeenCalled();
});
it('does not expose task modification or GET creation', async () => {
  expect((await GET(new Request('https://example.com'), context('create'))).status).toBe(404);
  expect((await POST(request(), context('delete'))).status).toBe(404);
  expect(calls.create).not.toHaveBeenCalled();
});
it('rejects malformed JSON and oversized streamed input before mutation', async () => {
  expect((await POST(request('{'), context('create'))).status).toBe(400);
  expect((await POST(request('a'.repeat(33000)), context('create'))).status).toBe(413);
  expect(calls.create).not.toHaveBeenCalled();
});
it('forwards only the explicit operation and returns no-store responses', async () => {
  calls.preview.mockResolvedValue({ title: 'Preview only' });
  const response = await POST(request('{"title":"Preview only"}'), context('preview'));
  expect(calls.preview).toHaveBeenCalledWith('signed-token', { title: 'Preview only' });
  expect(calls.create).not.toHaveBeenCalled();
  expect(response.headers.get('Cache-Control')).toBe('no-store');
});
it('does not return stack traces, tokens or internal errors', async () => {
  calls.create.mockRejectedValue(new Error('private database connection detail'));
  const response = await POST(request(), context('create'));
  expect(response.status).toBe(500);
  expect(await response.text()).not.toContain('private database');
});

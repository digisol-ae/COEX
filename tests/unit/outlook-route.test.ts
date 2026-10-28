import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ actor: vi.fn(), choices: vi.fn(), create: vi.fn() }));
vi.mock('@/lib/session', () => ({
  getSignedInUser: mocks.actor,
  asUser: (_user: unknown, work: () => unknown) => work(),
}));
vi.mock('@/modules/integrations/outlook/outlook.service', () => ({
  outlookChoices: mocks.choices,
  createOutlookTask: mocks.create,
}));
import { GET, POST } from '@/app/api/integrations/outlook/tasks/route';
beforeEach(() => vi.resetAllMocks());
it('refuses anonymous users, portal users and staff without task permission', async () => {
  for (const user of [
    null,
    { role: 'client_contact', permissions: ['task.manage'] },
    { role: 'agent', permissions: [] },
  ]) {
    mocks.actor.mockResolvedValue(user);
    expect((await GET()).status).toBe(401);
    expect(
      (
        await POST(
          new Request('http://localhost/api/integrations/outlook/tasks', {
            method: 'POST',
            body: '{}',
          }),
        )
      ).status,
    ).toBe(401);
  }
  expect(mocks.choices).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
});
it('refuses cross-origin and oversized task submissions before invoking services', async () => {
  mocks.actor.mockResolvedValue({ role: 'agent', permissions: ['task.manage'] });
  const url = 'http://localhost/api/integrations/outlook/tasks';
  expect(
    (
      await POST(
        new Request(url, {
          method: 'POST',
          headers: { origin: 'https://foreign.example' },
          body: '{}',
        }),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await POST(
        new Request(url, {
          method: 'POST',
          headers: { origin: 'http://localhost' },
          body: 'x'.repeat(15 * 1024 * 1024 + 1),
        }),
      )
    ).status,
  ).toBe(413);
  expect(mocks.create).not.toHaveBeenCalled();
});

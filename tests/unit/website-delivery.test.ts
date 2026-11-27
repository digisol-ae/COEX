import { beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({
  published: vi.fn(),
  editor: vi.fn(),
  defaults: vi.fn(),
  user: vi.fn(),
  asUser: vi.fn(),
}));
vi.mock('@/modules/core/services/website-content.service', () => ({
  publishedWebsite: mock.published,
  websiteEditor: mock.editor,
}));
vi.mock('@/modules/core/services/platform-settings.service', () => ({
  provisioningDefaults: mock.defaults,
}));
vi.mock('@/lib/session', () => ({ getSignedInUser: mock.user, asUser: mock.asUser }));
import {
  publicWebsiteDelivery,
  privateWebsiteDelivery,
} from '@/modules/core/services/website-delivery.service';
import { GET as preview } from '@/app/api/website/v1/preview/route';
import { GET as entry } from '@/app/api/website/v1/entry/route';
beforeEach(() => {
  vi.resetAllMocks();
  mock.defaults.mockResolvedValue({
    trialDays: 17,
    storageLimitBytes: 123,
    internalSetting: 'secret',
  });
  mock.published.mockResolvedValue({ texts: { published: 'Public' } });
  mock.editor.mockResolvedValue({
    draft: { texts: { draft: 'Private' } },
    history: ['secret'],
    media: ['secret'],
  });
  mock.asUser.mockImplementation((_user, work) => work());
});
it('public delivery exposes only published content and provisioning values', async () => {
  expect(await publicWebsiteDelivery()).toEqual({
    schemaVersion: 1,
    content: { texts: { published: 'Public' } },
    defaults: { trialDays: 17, storageLimitBytes: 123 },
  });
  expect(mock.editor).not.toHaveBeenCalled();
});
it('private published preview cannot bypass the stored owner guard', async () => {
  mock.editor.mockRejectedValue(new Error('Stored owner rejected'));
  await expect(privateWebsiteDelivery(true)).rejects.toThrow('Stored owner rejected');
  expect(mock.published).not.toHaveBeenCalled();
  expect(mock.defaults).not.toHaveBeenCalled();
});
it('anonymous and tenant administrators cannot read preview, including published mode', async () => {
  for (const user of [null, { role: 'admin', permissions: ['*'] }, { role: 'client_contact' }]) {
    mock.user.mockResolvedValue(user);
    const response = await preview(
      new Request('https://worktello.test/api/website/v1/preview?version=published'),
    );
    expect(response.status).toBe(user ? 403 : 401);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(response.headers.get('Vary')).toBe('Cookie');
  }
  expect(mock.editor).not.toHaveBeenCalled();
});
it('forged owner identity still passes through the stored-role guard', async () => {
  mock.user.mockResolvedValue({ role: 'platform_admin' });
  mock.editor.mockRejectedValue(new Error('No longer active'));
  const response = await preview(new Request('https://worktello.test/api/website/v1/preview'));
  expect(response.status).toBe(403);
  expect(await response.text()).not.toContain('draft');
});
it('owner preview contains content without editor history or actor metadata', async () => {
  mock.user.mockResolvedValue({ role: 'platform_admin' });
  const response = await preview(new Request('https://worktello.test/api/website/v1/preview'));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    schemaVersion: 1,
    content: { texts: { draft: 'Private' } },
    defaults: { trialDays: 17, storageLimitBytes: 123 },
  });
});
it('session entry returns only the correct destination without identity details', async () => {
  for (const [user, destination] of [
    [null, null],
    [{ role: 'admin', id: 'secret' }, '/dashboard'],
    [{ role: 'client_contact' }, '/portal'],
    [{ role: 'admin', workspaceAccess: 'suspended' }, '/workspace-status'],
  ] as const) {
    mock.user.mockResolvedValue(user);
    const response = await entry();
    expect(await response.json()).toEqual({ destination });
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  }
});

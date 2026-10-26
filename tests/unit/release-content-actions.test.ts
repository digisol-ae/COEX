import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  requireStaffUser: vi.fn(),
  change: vi.fn(),
  published: vi.fn(),
  acknowledge: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock('@/lib/session', () => ({
  requirePermission: mocks.requirePermission,
  requireStaffUser: mocks.requireStaffUser,
  asUser: async (_actor: unknown, work: () => Promise<unknown>) => work(),
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
vi.mock('@/modules/core/services/release-content.service', () => ({
  changeReleaseContent: mocks.change,
  getPublishedReleases: mocks.published,
}));
vi.mock('@/modules/core/services/user.service', () => ({
  acknowledgeReleaseNotes: mocks.acknowledge,
  saveTheme: vi.fn(),
}));
import { changeReleaseContentAction } from '@/app/(app)/setup/whats-new/actions';
import { acknowledgeReleaseNotesAction } from '@/app/(app)/preferences/actions';
beforeEach(() => {
  vi.resetAllMocks();
  mocks.requirePermission.mockResolvedValue({ id: 'admin' });
  mocks.requireStaffUser.mockResolvedValue({ id: 'staff' });
});
it('requires tenant management permission before any content mutation', async () => {
  mocks.requirePermission.mockRejectedValue(new Error('denied'));
  await expect(changeReleaseContentAction(0, { kind: 'delete', id: 'topic' })).rejects.toThrow(
    'denied',
  );
  expect(mocks.requirePermission).toHaveBeenCalledWith('tenant.manage');
  expect(mocks.change).not.toHaveBeenCalled();
});
it('returns conflicts without reporting success or refreshing content', async () => {
  mocks.change.mockRejectedValue(new Error('Content changed in another session.'));
  expect(await changeReleaseContentAction(0, { kind: 'publish', id: 'topic' })).toEqual({
    error: 'Content changed in another session.',
  });
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
it('never acknowledges an update that changed while the drawer was open', async () => {
  mocks.published.mockResolvedValue({ latestId: 'new-publication', releases: [] });
  expect((await acknowledgeReleaseNotesAction('old-publication')).error).toContain(
    'Updates have changed',
  );
  expect(mocks.acknowledge).not.toHaveBeenCalled();
});
it('acknowledges the publication actually displayed and retains save failures', async () => {
  mocks.published.mockResolvedValue({ latestId: 'shown-publication', releases: [] });
  expect(await acknowledgeReleaseNotesAction('shown-publication')).toEqual({});
  expect(mocks.acknowledge).toHaveBeenCalledWith('shown-publication');
  mocks.acknowledge.mockRejectedValue(new Error('Save unavailable'));
  expect(await acknowledgeReleaseNotesAction('shown-publication')).toEqual({
    error: 'Save unavailable',
  });
});

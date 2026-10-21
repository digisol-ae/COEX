import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), task: vi.fn(), image: vi.fn() }));
vi.mock('@/lib/session', () => ({
  getSignedInUser: mocks.user,
  asUser: async (_user: unknown, fn: () => unknown) => fn(),
}));
vi.mock('@/modules/tasks/services/task.service', () => ({
  getTask: mocks.task,
  taskUpdateImage: mocks.image,
}));
vi.mock('@/modules/tickets/services/attachment.service', () => ({
  PROCESSED_IMAGE_TYPES: new Set(['image/png', 'image/jpeg', 'image/webp']),
}));
import { GET } from '@/app/api/tasks/[id]/attachments/[attachmentId]/route';
const id = '111111111111111111111111';
const attachmentId = '222222222222222222222222';
const request = () =>
  GET(new Request('http://localhost/image?view=1'), {
    params: Promise.resolve({ id, attachmentId }),
  });
beforeEach(() => {
  vi.resetAllMocks();
});
it('requires a signed-in staff reader', async () => {
  mocks.user.mockResolvedValue(null);
  expect((await request()).status).toBe(401);
  mocks.user.mockResolvedValue({
    role: 'client_contact',
    permissions: ['task.read.own', 'task.read.all'],
  });
  expect((await request()).status).toBe(403);
  mocks.user.mockResolvedValue({ role: 'agent', permissions: [] });
  expect((await request()).status).toBe(403);
  expect(mocks.image).not.toHaveBeenCalled();
});
it('refuses another assignee or a task outside visible scope', async () => {
  mocks.user.mockResolvedValue({ id: 'me', role: 'agent', permissions: ['task.read.own'] });
  mocks.task.mockResolvedValue({ assigneeIds: ['someone-else'] });
  expect((await request()).status).toBe(404);
  mocks.task.mockResolvedValue(null);
  expect((await request()).status).toBe(404);
  expect(mocks.image).not.toHaveBeenCalled();
});
it('serves permitted images privately with inline thumbnails and no sniffing', async () => {
  mocks.user.mockResolvedValue({ id: 'me', role: 'agent', permissions: ['task.read.own'] });
  mocks.task.mockResolvedValue({ assigneeIds: ['me'] });
  mocks.image.mockResolvedValue({
    fileName: 'paste.png',
    contentType: 'image/png',
    body: Buffer.from('image'),
  });
  const response = await request();
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('image/png');
  expect(response.headers.get('content-disposition')).toContain('inline');
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(response.headers.get('x-content-type-options')).toBe('nosniff');
});

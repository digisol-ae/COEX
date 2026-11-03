import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ actor: vi.fn(), space: vi.fn(), tasks: vi.fn(), pdf: vi.fn() }));
vi.mock('@/lib/session', () => ({
  getSignedInUser: m.actor,
  asUser: (_user: unknown, work: () => unknown) => work(),
}));
vi.mock('@/modules/tasks/services/space.service', () => ({ getSpace: m.space }));
vi.mock('@/modules/tasks/services/task.service', () => ({ listTasks: m.tasks }));
vi.mock('@/modules/tasks/gantt-report', () => ({ buildGanttPDF: m.pdf }));
import { POST } from '@/app/(app)/spaces/[id]/gantt/pdf/route';
const spaceId = '111111111111111111111111',
  taskId = '222222222222222222222222';
const params = { params: Promise.resolve({ id: spaceId }) };
const request = (body: unknown = { taskIds: [taskId] }, origin = 'http://localhost') =>
  new Request(`http://localhost/spaces/${spaceId}/gantt/pdf`, {
    method: 'POST',
    headers: { origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.resetAllMocks();
  m.actor.mockResolvedValue({ role: 'tenant_admin', permissions: ['task.read.all'] });
  m.space.mockResolvedValue({ name: 'QA space' });
  m.tasks.mockResolvedValue([{ id: taskId }]);
  m.pdf.mockResolvedValue(Buffer.from('%PDF-qa'));
});
it('requires a staff account with task read-all permission before loading chart data', async () => {
  for (const user of [
    null,
    { role: 'client_contact', permissions: ['task.read.all'] },
    { role: 'agent', permissions: ['task.read.own'] },
  ]) {
    m.actor.mockResolvedValue(user);
    expect([401, 403]).toContain((await POST(request(), params)).status);
  }
  expect(m.space).not.toHaveBeenCalled();
  expect(m.pdf).not.toHaveBeenCalled();
});
it('rejects foreign origins and inaccessible spaces or filtered-out tasks', async () => {
  expect((await POST(request(undefined, 'https://foreign.example'), params)).status).toBe(403);
  m.space.mockResolvedValue(null);
  expect((await POST(request(), params)).status).toBe(404);
  m.space.mockResolvedValue({ name: 'QA' });
  m.tasks.mockResolvedValue([]);
  expect((await POST(request(), params)).status).toBe(404);
  expect(m.pdf).not.toHaveBeenCalled();
});
it('exports only selected authorized tasks, carries collapse settings and sends private PDF headers', async () => {
  const response = await POST(
    request({ taskIds: [taskId], showSubtasks: true, collapsedIds: [taskId] }),
    params,
  );
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('application/pdf');
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(m.tasks).toHaveBeenCalledWith({ spaceId, ids: [taskId], includeClosed: true });
  expect(m.pdf.mock.calls[0][0]).toMatchObject({ showSubtasks: true, collapsedIds: [taskId] });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => ({ user: null as unknown, asUser: vi.fn() }));
vi.mock('@/lib/session', () => ({ getSignedInUser: async () => auth.user, asUser: auth.asUser }));
import { GET as searchTickets } from '@/app/api/tickets/search/route';
import { GET as searchAll } from '@/app/api/search/route';
import { GET as tutorial } from '@/app/api/tutorials/route';
import { GET as attachment } from '@/app/api/portal/tickets/[id]/attachments/[attachmentId]/route';
import { GET as notifications } from '@/app/api/portal/notifications/route';
beforeEach(() => {
  auth.asUser.mockClear();
});
describe('portal/staff HTTP boundaries', () => {
  it('requires a customer session for portal notifications', async () => {
    auth.user = null;
    expect(
      (await notifications(new Request('http://localhost/api/portal/notifications'))).status,
    ).toBe(401);
    auth.user = { role: 'tenant_admin' };
    expect(
      (await notifications(new Request('http://localhost/api/portal/notifications'))).status,
    ).toBe(403);
    expect(auth.asUser).not.toHaveBeenCalled();
  });
  it('rejects customer sessions on staff endpoints even with broad permission overrides', async () => {
    auth.user = {
      role: 'client_contact',
      permissions: [
        'ticket.read.own',
        'ticket.read.all',
        'ticket.manage',
        'customer.read',
        'task.read.all',
        'tenant.manage',
      ],
    };
    for (const route of [searchTickets, searchAll, tutorial])
      expect((await route(new Request('http://localhost/api/search?q=private'))).status).toBe(403);
    expect(auth.asUser).not.toHaveBeenCalled();
  });
  it('requires a customer session on the portal attachment endpoint', async () => {
    const args = { params: Promise.resolve({ id: '123', attachmentId: '456' }) };
    auth.user = { role: 'tenant_admin', permissions: [] };
    expect((await attachment(new Request('http://localhost'), args)).status).toBe(403);
    auth.user = null;
    expect((await attachment(new Request('http://localhost'), args)).status).toBe(401);
    expect(auth.asUser).not.toHaveBeenCalled();
  });
});

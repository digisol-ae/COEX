import { beforeEach, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/tickets/[id]/preview/route';
import { getSignedInUser } from '@/lib/session';
import { getTicketDetail } from '@/modules/tickets/services/ticket.service';

vi.mock('@/lib/session', () => ({
  getSignedInUser: vi.fn(),
  asUser: vi.fn((_actor: unknown, work: () => Promise<unknown>) => work()),
}));
vi.mock('@/modules/tickets/services/ticket.service', () => ({ getTicketDetail: vi.fn() }));
vi.mock('@/modules/time/services/time.service', () => ({
  loggedMinutesForTicket: vi.fn().mockResolvedValue(42),
}));

function actor(permissions: string[]) {
  vi.mocked(getSignedInUser).mockResolvedValue({ id: 'agent', permissions } as NonNullable<
    Awaited<ReturnType<typeof getSignedInUser>>
  >);
}
function ticket(assigneeId = 'agent') {
  vi.mocked(getTicketDetail).mockResolvedValue({
    number: 'T-1',
    subject: 'Example',
    status: 'open',
    priority: 'normal',
    assigneeId,
    queueName: 'Support',
    organisationName: 'Customer',
    contactName: 'Contact',
    assigneeName: 'Agent',
    lastActivityAt: new Date('2026-10-03T00:00:00Z'),
    messages: [
      { visibility: 'public', body: 'Customer problem', authorName: 'Customer', attachments: [] },
      {
        visibility: 'internal',
        body: 'Private staff note',
        authorName: 'Agent',
        attachments: [{ id: 'private-file' }],
      },
    ],
  } as Awaited<ReturnType<typeof getTicketDetail>>);
}
function request() {
  return GET(new Request('http://localhost/api/tickets/test/preview'), {
    params: Promise.resolve({ id: 'test' }),
  });
}
beforeEach(() => vi.clearAllMocks());

it('refuses anonymous and unauthorized preview requests', async () => {
  vi.mocked(getSignedInUser).mockResolvedValue(null);
  expect((await request()).status).toBe(401);
  actor([]);
  expect((await request()).status).toBe(403);
  expect(getTicketDetail).not.toHaveBeenCalled();
});
it('refuses a ticket assigned to someone else without all-ticket access', async () => {
  actor(['ticket.read.own']);
  ticket('other');
  expect((await request()).status).toBe(404);
});
it('hides internal notes and private attachment counts from read-only viewers', async () => {
  actor(['ticket.read.own']);
  ticket();
  const response = await request();
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.brief).toBe('Customer problem');
  expect(body.latest.body).toBe('Customer problem');
  expect(body.attachmentCount).toBe(0);
  expect(body.loggedMinutes).toBe(42);
});
it('allows all-ticket agents to see the latest internal note', async () => {
  actor(['ticket.read.own', 'ticket.read.all', 'ticket.manage']);
  ticket('other');
  const response = await request();
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.latest.internal).toBe(true);
  expect(body.latest.body).toBe('Private staff note');
  expect(body.attachmentCount).toBe(1);
});

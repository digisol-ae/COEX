import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchContext } from '@/components/navigation/search-context';
const state = vi.hoisted(() => ({
  user: null as null | { id: string; role: string; permissions: string[] },
}));
const services = vi.hoisted(() => ({
  tasks: vi.fn(),
  spaces: vi.fn(),
  tickets: vi.fn(),
  customers: vi.fn(),
  products: vi.fn(),
  contracts: vi.fn(),
  leads: vi.fn(),
  opportunities: vi.fn(),
}));
vi.mock('@/lib/session', () => ({
  getSignedInUser: async () => state.user,
  asUser: async (_: unknown, run: () => unknown) => run(),
}));
vi.mock('@/modules/tasks/services/task.service', () => ({ listTasks: services.tasks }));
vi.mock('@/modules/tasks/services/space.service', () => ({ listSpaces: services.spaces }));
vi.mock('@/modules/tickets/services/ticket.service', () => ({ searchTickets: services.tickets }));
vi.mock('@/modules/crm/services/organisation.service', () => ({
  listOrganisations: services.customers,
}));
vi.mock('@/modules/crm/services/product.service', () => ({ listProducts: services.products }));
vi.mock('@/modules/crm/services/contract.service', () => ({ listContracts: services.contracts }));
vi.mock('@/modules/crm/services/lead.service', () => ({ listLeads: services.leads }));
vi.mock('@/modules/crm/services/opportunity.service', () => ({
  listOpportunities: services.opportunities,
}));
import { GET } from '@/app/api/search/route';
const request = (scope: string) =>
  new Request(`http://localhost/api/search?q=printer&scope=${scope}`);
beforeEach(() => {
  vi.clearAllMocks();
  Object.values(services).forEach((mock) => mock.mockResolvedValue([]));
  state.user = {
    id: 'agent',
    role: 'staff',
    permissions: [
      'task.read.own',
      'task.read.all',
      'ticket.read.own',
      'ticket.read.all',
      'customer.read',
      'products.read',
      'contract.read',
      'lead.read',
      'opportunity.read',
    ],
  };
});
describe('section search boundaries', () => {
  it('maps nested ticket routes and CRM sections without leaking scope to settings', () => {
    expect(searchContext('/support/tickets/123')?.scope).toBe('tickets');
    expect(searchContext('/customers/123')?.scope).toBe('customers');
    expect(searchContext('/contracts')?.scope).toBe('contracts');
    expect(searchContext('/dashboard')?.scope).toBe('all');
    expect(searchContext('/setup/email')).toBeNull();
  });
  it.each([
    'tasks',
    'spaces',
    'tickets',
    'customers',
    'products',
    'contracts',
    'leads',
    'opportunities',
  ] as const)('only queries %s services for that section', async (scope) => {
    expect((await GET(request(scope))).status).toBe(200);
    expect(services[scope]).toHaveBeenCalledOnce();
    for (const [name, mock] of Object.entries(services))
      if (name !== scope) expect(mock).not.toHaveBeenCalled();
  });
  it('refuses unsupported scopes without searching', async () => {
    expect((await GET(request('unknown'))).status).toBe(400);
    Object.values(services).forEach((mock) => expect(mock).not.toHaveBeenCalled());
  });
  it('keeps assigned-only ticket filtering and blocks unauthorized sections', async () => {
    state.user!.permissions = ['ticket.read.own'];
    services.tickets.mockResolvedValue([
      { id: 'a', number: '1', subject: 'printer', status: 'open', assigneeId: 'other' },
      { id: 'b', number: '2', subject: 'printer', status: 'open', assigneeId: 'agent' },
    ]);
    expect(
      (await (await GET(request('tickets'))).json()).results.map((r: { href: string }) => r.href),
    ).toEqual(['/support/tickets/b']);
    expect((await (await GET(request('customers'))).json()).results).toEqual([]);
    expect(services.customers).not.toHaveBeenCalled();
  });
  it('refuses anonymous and customer accounts', async () => {
    state.user = null;
    expect((await GET(request('tickets'))).status).toBe(401);
    state.user = { id: 'customer', role: 'client_contact', permissions: [] };
    expect((await GET(request('tickets'))).status).toBe(403);
  });
});

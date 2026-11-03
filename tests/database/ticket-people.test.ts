import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { createOrganisation } from '@/modules/crm/services/organisation.service';
import { createContact, listContacts } from '@/modules/crm/services/contact.service';
import { linkTicketPeople, searchTicketPeople } from '@/modules/crm/services/ticket-people.service';
import { TicketModel } from '@coex/shared/tickets/models/ticket.model';
import { UserModel } from '@coex/shared/core/models/user.model';

const tenantId = new Types.ObjectId();
const otherTenant = new Types.ObjectId();
const context = { tenantId, userId: new Types.ObjectId(), isPlatformAdmin: false };
const queueId = new Types.ObjectId();
let counter = 0;

function ticket(fields: Record<string, unknown>, tenant = tenantId) {
  counter += 1;
  return TicketModel.create({
    tenantId: tenant,
    number: `S-${counter}`,
    subject: `Ticket ${counter}`,
    queueId,
    ...fields,
  });
}

beforeAll(async () => {
  await connectForTests('ticket_people');
});
afterAll(async () => {
  await disconnectFromTests();
});
beforeEach(async () => {
  await clearDatabase();
});

describe('contacts from tickets', () => {
  it('finds requesters and CCs, suggests same-domain people and hides staff and other tenants', async () => {
    const org = await runWithContext(context, () =>
      createOrganisation({ name: 'Dental Studio', kind: 'client', email: 'info@dentalstudio.ae' }),
    );
    await UserModel.create({
      tenantId,
      name: 'Agent',
      email: 'agent@digisol.ae',
      role: 'agent',
      status: 'active',
    }).catch(() => null);
    await ticket({ requesterEmail: 'sara@dentalstudio.ae', requesterName: 'Sara' });
    await ticket({
      requesterEmail: 'sara@dentalstudio.ae',
      ccEmails: ['agent@digisol.ae', 'it@dentalstudio.ae'],
    });
    await ticket({ requesterEmail: 'someone@gmail.com', requesterName: 'Sara Khan' });
    await ticket({ requesterEmail: 'sara@dentalstudio.ae' }, otherTenant);

    const suggested = await runWithContext(context, () => searchTicketPeople(org, ''));
    expect(suggested.suggestions).toBe(true);
    expect(suggested.people.map((p) => [p.email, p.tickets])).toEqual([
      ['sara@dentalstudio.ae', 2],
      ['it@dentalstudio.ae', 1],
    ]);

    const searched = await runWithContext(context, () => searchTicketPeople(org, 'sara'));
    expect(searched.people.map((p) => p.email).sort()).toEqual([
      'sara@dentalstudio.ae',
      'someone@gmail.com',
    ]);

    const noPattern = await runWithContext(context, () => searchTicketPeople(org, '.*('));
    expect(noPattern.people).toEqual([]);
  });

  it('creates contacts, files their unassigned tickets, and asks before moving', async () => {
    const { here, there } = await runWithContext(context, async () => ({
      here: await createOrganisation({ name: 'Here', kind: 'client' }),
      there: await createOrganisation({ name: 'There', kind: 'client' }),
    }));
    const owned = await runWithContext(context, () =>
      createContact({ organisationId: there, name: 'Omar', email: 'omar@there.ae' }),
    );
    const loose = await ticket({ requesterEmail: 'new@here.ae', requesterName: 'New Person' });
    const filedElsewhere = await ticket({
      requesterEmail: 'omar@there.ae',
      contactId: new Types.ObjectId(owned),
      organisationId: new Types.ObjectId(there),
    });

    const first = await runWithContext(context, () =>
      linkTicketPeople(
        here,
        [
          { contactId: null, name: 'New Person', email: 'new@here.ae', phone: null },
          { contactId: owned, name: 'Omar', email: 'omar@there.ae', phone: null },
        ],
        false,
      ),
    );
    expect(first.added).toBe(0);
    expect(first.conflicts).toEqual([{ name: 'Omar', organisationName: 'There' }]);
    expect(await runWithContext(context, () => listContacts(here))).toHaveLength(0);

    const second = await runWithContext(context, () =>
      linkTicketPeople(
        here,
        [
          { contactId: null, name: 'New Person', email: 'new@here.ae', phone: null },
          { contactId: owned, name: 'Omar', email: 'omar@there.ae', phone: null },
        ],
        true,
      ),
    );
    expect(second).toMatchObject({ added: 2, created: 1, moved: 1, ticketsLinked: 1 });

    const contacts = await runWithContext(context, () => listContacts(here));
    expect(contacts.map((c) => c.name).sort()).toEqual(['New Person', 'Omar']);

    const looseAfter = await TicketModel.findById(loose._id);
    expect(String(looseAfter?.organisationId)).toBe(here);
    expect(String(looseAfter?.contactId)).toBe(contacts.find((c) => c.name === 'New Person')?.id);
    // History filed under the other customer stays there.
    expect(String((await TicketModel.findById(filedElsewhere._id))?.organisationId)).toBe(there);

    const again = await runWithContext(context, () =>
      linkTicketPeople(
        here,
        [{ contactId: null, name: 'New Person', email: 'new@here.ae', phone: null }],
        false,
      ),
    );
    expect(again).toMatchObject({ added: 0, alreadyHere: 1 });
  });
});

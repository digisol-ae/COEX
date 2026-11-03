import { describe, expect, it } from 'vitest';
import {
  customerDomains,
  mergeTicketPeople,
  parseTicketPersonSelection,
  rankTicketPeople,
  type KnownContact,
  type TicketPersonRow,
} from '@coex/shared/crm/ticket-people';

const ORG = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const day = (d: number) => new Date(Date.UTC(2026, 9, d));

function row(overrides: Partial<TicketPersonRow>): TicketPersonRow {
  return {
    contactId: null,
    name: null,
    email: null,
    phone: null,
    tickets: 1,
    lastTicketAt: day(1),
    ...overrides,
  };
}

describe('people from tickets', () => {
  it('derives company domains and ignores free mailbox providers', () => {
    expect(customerDomains(['it@DentalStudio.ae', 'x@gmail.com', null, 'bad'])).toEqual([
      'dentalstudio.ae',
    ]);
  });

  it('merges requester and CC rows for the same address and adds their tickets up', () => {
    const people = mergeTicketPeople(
      [
        row({ name: 'Sara', email: 'Sara@clinic.ae', tickets: 3, lastTicketAt: day(2) }),
        row({ email: 'sara@clinic.ae', tickets: 2, lastTicketAt: day(9), ccOnly: true }),
      ],
      [],
      { organisationId: ORG, domains: ['clinic.ae'] },
    );
    expect(people).toHaveLength(1);
    expect(people[0]).toMatchObject({
      name: 'Sara',
      email: 'sara@clinic.ae',
      tickets: 5,
      ccOnly: false,
      domainMatch: true,
      linkedHere: false,
    });
    expect(people[0].lastTicketAt).toBe(day(9).toISOString());
  });

  it('uses the CRM contact and flags who is already linked or belongs elsewhere', () => {
    const contacts: KnownContact[] = [
      {
        id: 'c1',
        name: 'Ali',
        email: 'ali@x.ae',
        mobile: null,
        organisationId: ORG,
        organisationName: 'Here',
      },
      {
        id: 'c2',
        name: 'Omar',
        email: null,
        mobile: '+971501234567',
        organisationId: OTHER,
        organisationName: 'Other',
      },
    ];
    const people = mergeTicketPeople(
      [
        row({ contactId: 'c1', email: 'ali@x.ae' }),
        row({ email: 'ali@x.ae', ccOnly: true }),
        row({ phone: '+971501234567', name: 'WhatsApp user' }),
      ],
      contacts,
      { organisationId: ORG, domains: [] },
    );
    expect(people).toHaveLength(2);
    expect(people.find((p) => p.contactId === 'c1')).toMatchObject({
      linkedHere: true,
      tickets: 2,
    });
    expect(people.find((p) => p.contactId === 'c2')).toMatchObject({
      name: 'Omar',
      organisationName: 'Other',
      linkedHere: false,
    });
  });

  it('drops staff addresses copied on tickets', () => {
    const people = mergeTicketPeople(
      [row({ email: 'agent@digisol.ae', ccOnly: true }), row({ email: 'client@c.ae' })],
      [],
      { organisationId: ORG, domains: [], staffEmails: ['Agent@DigiSol.ae'] },
    );
    expect(people.map((p) => p.email)).toEqual(['client@c.ae']);
  });

  it('ranks same-domain people first and already-linked people last', () => {
    const ranked = rankTicketPeople(
      mergeTicketPeople(
        [
          row({ email: 'busy@else.com', tickets: 9 }),
          row({ email: 'match@c.ae', tickets: 1 }),
          row({ contactId: 'c1', tickets: 20 }),
        ],
        [
          {
            id: 'c1',
            name: 'Linked',
            email: 'l@else.com',
            mobile: null,
            organisationId: ORG,
            organisationName: 'Here',
          },
        ],
        { organisationId: ORG, domains: ['c.ae'] },
      ),
    );
    expect(ranked.map((p) => p.email)).toEqual(['match@c.ae', 'busy@else.com', 'l@else.com']);
  });

  it('validates the selection sent back from the browser', () => {
    expect(
      parseTicketPersonSelection(JSON.stringify([{ name: ' Sara ', email: 'SARA@c.ae' }])),
    ).toEqual([{ contactId: null, name: 'Sara', email: 'sara@c.ae', phone: null }]);
    expect(() => parseTicketPersonSelection('[]')).toThrow('Choose at least one');
    expect(() => parseTicketPersonSelection('[{"name":"x"}]')).toThrow('email or phone');
    expect(() => parseTicketPersonSelection('[{"contactId":"$ne"}]')).toThrow('Invalid contact');
    expect(() => parseTicketPersonSelection('[{"email":"a@b.c\\r\\nBcc: x"}]')).toThrow();
  });
});

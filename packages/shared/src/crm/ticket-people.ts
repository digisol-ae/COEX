/**
 * People who appear on tickets, offered as contacts for a customer.
 *
 * Tickets keep whoever wrote in (requesterEmail, requesterName, requesterPhone) and whoever was
 * copied (ccEmails) even when nobody has linked them to the CRM yet, which is most of the history
 * migrated from osTicket. This module merges those rows into one entry per person so a customer's
 * Contacts panel can search them and link them in one step.
 *
 * Pure functions only, so the merging and ranking rules are tested without a database.
 */

/** Free mailbox providers say nothing about which company someone works for. */
export const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'icloud.com',
  'me.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'zoho.com',
  'gmx.com',
]);

export function emailDomain(email: string | null | undefined): string | null {
  const at = email?.lastIndexOf('@') ?? -1;
  if (!email || at < 1) return null;
  return (
    email
      .slice(at + 1)
      .trim()
      .toLowerCase() || null
  );
}

/** Domains that identify a customer: its own email plus its existing contacts' emails. */
export function customerDomains(emails: (string | null | undefined)[]): string[] {
  const domains = new Set<string>();
  for (const email of emails) {
    const domain = emailDomain(email);
    if (domain && !PUBLIC_EMAIL_DOMAINS.has(domain)) domains.add(domain);
  }
  return [...domains];
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** One row of raw evidence that a person appeared on tickets. */
export interface TicketPersonRow {
  contactId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  tickets: number;
  lastTicketAt: Date | null;
  /** Set when the person was only ever copied, never the requester. */
  ccOnly?: boolean;
}

/** A CRM contact record, when the person already has one. */
export interface KnownContact {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  organisationId: string | null;
  organisationName: string | null;
}

export interface TicketPerson {
  /** Stable key for selection: contact id when known, otherwise the email or phone. */
  key: string;
  contactId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  domain: string | null;
  tickets: number;
  lastTicketAt: string | null;
  ccOnly: boolean;
  organisationId: string | null;
  organisationName: string | null;
  /** Already a contact of the customer being edited. */
  linkedHere: boolean;
  /** Email domain matches the customer, so the person is probably theirs. */
  domainMatch: boolean;
}

function later(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

/**
 * Merges ticket rows and known contacts into one entry per person.
 *
 * A person is the same when they share a contact id, an email address or a phone number. Staff
 * addresses are dropped, since an agent copied on a ticket is never a customer contact.
 */
export function mergeTicketPeople(
  rows: TicketPersonRow[],
  contacts: KnownContact[],
  options: {
    organisationId: string;
    domains: string[];
    staffEmails?: Iterable<string>;
  },
): TicketPerson[] {
  const staff = new Set([...(options.staffEmails ?? [])].map((e) => e.toLowerCase()));
  const byContactId = new Map(contacts.map((c) => [c.id, c]));
  const contactByEmail = new Map<string, KnownContact>();
  const contactByPhone = new Map<string, KnownContact>();
  for (const contact of contacts) {
    if (contact.email) contactByEmail.set(contact.email.toLowerCase(), contact);
    if (contact.mobile) contactByPhone.set(contact.mobile, contact);
  }

  interface Draft {
    contact: KnownContact | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    tickets: number;
    lastTicketAt: Date | null;
    ccOnly: boolean;
  }
  const people = new Map<string, Draft>();
  const aliases = new Map<string, string>();

  for (const row of rows) {
    const email = row.email?.trim().toLowerCase() || null;
    const phone = row.phone?.trim() || null;
    if (email && staff.has(email)) continue;
    if (!row.contactId && !email && !phone) continue;

    const contact =
      (row.contactId ? byContactId.get(row.contactId) : undefined) ??
      (email ? contactByEmail.get(email) : undefined) ??
      (phone ? contactByPhone.get(phone) : undefined) ??
      null;
    if (contact?.email && staff.has(contact.email.toLowerCase())) continue;

    const identities = [
      contact ? `c:${contact.id}` : null,
      email ? `e:${email}` : null,
      contact?.email ? `e:${contact.email.toLowerCase()}` : null,
      phone ? `p:${phone}` : null,
      contact?.mobile ? `p:${contact.mobile}` : null,
    ].filter((v): v is string => Boolean(v));

    const existingKey = identities.map((id) => aliases.get(id)).find(Boolean);
    const key = existingKey ?? identities[0];
    for (const id of identities) aliases.set(id, key);

    const draft = people.get(key) ?? {
      contact: null,
      name: null,
      email: null,
      phone: null,
      tickets: 0,
      lastTicketAt: null,
      ccOnly: true,
    };
    draft.contact = draft.contact ?? contact;
    draft.name = draft.name ?? (row.name?.trim() || null);
    draft.email = draft.email ?? email;
    draft.phone = draft.phone ?? phone;
    draft.tickets += row.tickets;
    draft.lastTicketAt = later(draft.lastTicketAt, row.lastTicketAt);
    draft.ccOnly = draft.ccOnly && Boolean(row.ccOnly);
    people.set(key, draft);
  }

  const domains = new Set(options.domains.map((d) => d.toLowerCase()));

  return [...people.values()].map((draft) => {
    const email = draft.contact?.email ?? draft.email;
    const phone = draft.contact?.mobile ?? draft.phone;
    const domain = emailDomain(email);
    const name = draft.contact?.name || draft.name || email || phone || 'Unknown';
    return {
      key: draft.contact ? `c:${draft.contact.id}` : email ? `e:${email}` : `p:${phone}`,
      contactId: draft.contact?.id ?? null,
      name,
      email,
      phone,
      domain,
      tickets: draft.tickets,
      lastTicketAt: draft.lastTicketAt ? draft.lastTicketAt.toISOString() : null,
      ccOnly: draft.ccOnly,
      organisationId: draft.contact?.organisationId ?? null,
      organisationName: draft.contact?.organisationName ?? null,
      linkedHere: draft.contact?.organisationId === options.organisationId,
      domainMatch: Boolean(domain && domains.has(domain)),
    };
  });
}

/** Same-domain people first, then those not yet linked, then the busiest, then by name. */
export function rankTicketPeople(people: TicketPerson[]): TicketPerson[] {
  return [...people].sort(
    (a, b) =>
      Number(b.domainMatch) - Number(a.domainMatch) ||
      Number(a.linkedHere) - Number(b.linkedHere) ||
      b.tickets - a.tickets ||
      a.name.localeCompare(b.name),
  );
}

/** What the browser sends back for each person ticked in the picker. */
export interface TicketPersonSelection {
  contactId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
}

export function parseTicketPersonSelection(raw: string): TicketPersonSelection[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Choose at least one person.');
  }
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Choose at least one person.');
  if (parsed.length > 100) throw new Error('Add up to 100 people at a time.');

  return parsed.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const str = (value: unknown, max: number) =>
      typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
    const contactId = str(row.contactId, 24);
    const email = str(row.email, 254)?.toLowerCase() ?? null;
    const phone = str(row.phone, 32);
    if (contactId && !/^[a-f0-9]{24}$/i.test(contactId)) throw new Error('Invalid contact.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new Error('Invalid email address.');
    if (!contactId && !email && !phone) throw new Error('Each person needs an email or phone.');
    return { contactId, name: str(row.name, 120) ?? email ?? phone ?? 'Unknown', email, phone };
  });
}

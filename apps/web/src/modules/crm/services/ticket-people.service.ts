import { STAFF_ROLES } from '@coex/shared/core/permissions';
import type { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { repository } from '@/lib/repository';
import { toObjectId } from '@/lib/ids';
import { recordAudit } from '@/modules/core/services/audit.service';
import { ownEmailAddresses } from '@/modules/core/services/email.service';
import { createContact } from './contact.service';
import { ContactModel } from '@coex/shared/crm/models/contact.model';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { TicketModel } from '@coex/shared/tickets/models/ticket.model';
import {
  customerDomains,
  escapeRegex,
  mergeTicketPeople,
  rankTicketPeople,
  type KnownContact,
  type TicketPerson,
  type TicketPersonRow,
  type TicketPersonSelection,
} from '@coex/shared/crm/ticket-people';

/**
 * Searches everyone who has appeared on a ticket (requesters and CC'd addresses) so they can be
 * linked to a customer as contacts, and links them.
 *
 * Every query goes through the tenant scope from the repository, so one tenant never sees another
 * tenant's ticket requesters.
 */

const RESULT_LIMIT = 30;
const ROW_LIMIT = 300;

interface GroupedRequester {
  _id: { c: Types.ObjectId | null; e: string | null; p: string | null };
  name: string | null;
  tickets: number;
  last: Date | null;
}

interface GroupedCc {
  _id: string;
  tickets: number;
  last: Date | null;
}

export interface TicketPeopleResult {
  people: TicketPerson[];
  /** True when nothing was typed and the list is same-domain suggestions. */
  suggestions: boolean;
  domains: string[];
}

export async function searchTicketPeople(
  organisationId: string,
  rawQuery: string,
): Promise<TicketPeopleResult> {
  await connectToDatabase();
  const { tenantId } = getContext();
  const tickets = repository(TicketModel);
  const contacts = repository(ContactModel);

  const organisation = await repository(OrganisationModel).findById(organisationId);
  if (!organisation) throw new Error('Customer not found.');

  const ownContacts = await contacts.find({ organisationId: organisation._id }).select('email');
  const domains = customerDomains([organisation.email, ...ownContacts.map((c) => c.email)]);

  const query = rawQuery.trim().slice(0, 80);
  const suggestions = query.length < 2;
  if (suggestions && domains.length === 0) return { people: [], suggestions, domains };

  const pattern = suggestions
    ? new RegExp(`@(${domains.map(escapeRegex).join('|')})$`, 'i')
    : new RegExp(escapeRegex(query), 'i');
  const digits = query.replace(/[^\d]/g, '');
  const phonePattern = !suggestions && digits.length >= 4 ? new RegExp(escapeRegex(digits)) : null;

  // Contacts whose CRM record matches, so a ticket that only carries a contactId is still found.
  const matchingContacts = await contacts
    .find({
      $or: [
        { email: pattern },
        ...(suggestions ? [] : [{ name: pattern }]),
        ...(phonePattern ? [{ mobile: phonePattern }] : []),
      ],
    })
    .select('_id')
    .limit(ROW_LIMIT);

  const base = { ...tickets.scope(), mergedIntoId: null };

  const [requesterRows, ccRows] = await Promise.all([
    TicketModel.aggregate<GroupedRequester>([
      {
        $match: {
          ...base,
          $or: [
            { requesterEmail: pattern },
            ...(suggestions ? [] : [{ requesterName: pattern }]),
            ...(phonePattern ? [{ requesterPhone: phonePattern }] : []),
            ...(matchingContacts.length
              ? [{ contactId: { $in: matchingContacts.map((c) => c._id) } }]
              : []),
          ],
        },
      },
      {
        $group: {
          _id: { c: '$contactId', e: '$requesterEmail', p: '$requesterPhone' },
          name: { $max: '$requesterName' },
          tickets: { $sum: 1 },
          last: { $max: '$createdAt' },
        },
      },
      { $sort: { tickets: -1 } },
      { $limit: ROW_LIMIT },
    ]),
    TicketModel.aggregate<GroupedCc>([
      { $match: { ...base, ccEmails: pattern } },
      { $unwind: '$ccEmails' },
      { $match: { ccEmails: pattern } },
      { $group: { _id: '$ccEmails', tickets: { $sum: 1 }, last: { $max: '$createdAt' } } },
      { $sort: { tickets: -1 } },
      { $limit: ROW_LIMIT },
    ]),
  ]);

  const rows: TicketPersonRow[] = [
    ...requesterRows.map((row) => ({
      contactId: row._id.c ? String(row._id.c) : null,
      name: row.name,
      email: row._id.e,
      phone: row._id.p,
      tickets: row.tickets,
      lastTicketAt: row.last,
    })),
    ...ccRows.map((row) => ({
      contactId: null,
      name: null,
      email: row._id,
      phone: null,
      tickets: row.tickets,
      lastTicketAt: row.last,
      ccOnly: true,
    })),
  ];

  const known = await loadKnownContacts(rows);
  const staffEmails = await loadStaffEmails(tenantId);

  const people = rankTicketPeople(
    mergeTicketPeople(rows, known, {
      organisationId: String(organisation._id),
      domains,
      staffEmails,
    }),
  ).slice(0, RESULT_LIMIT);

  return { people, suggestions, domains };
}

async function loadKnownContacts(rows: TicketPersonRow[]): Promise<KnownContact[]> {
  const ids = [...new Set(rows.map((r) => r.contactId).filter((v): v is string => Boolean(v)))];
  const emails = [...new Set(rows.map((r) => r.email).filter((v): v is string => Boolean(v)))];
  const phones = [...new Set(rows.map((r) => r.phone).filter((v): v is string => Boolean(v)))];
  if (!ids.length && !emails.length && !phones.length) return [];

  const found = await repository(ContactModel)
    .find({
      $or: [
        ...(ids.length ? [{ _id: { $in: ids.map((id) => toObjectId(id)) } }] : []),
        ...(emails.length ? [{ email: { $in: emails } }] : []),
        ...(phones.length ? [{ mobile: { $in: phones } }] : []),
      ],
    })
    .select('name email mobile organisationId');

  const orgIds = [
    ...new Set(
      found
        .map((c) => c.organisationId)
        .filter(Boolean)
        .map(String),
    ),
  ];
  const orgs = orgIds.length
    ? await repository(OrganisationModel)
        .find({ _id: { $in: orgIds.map((id) => toObjectId(id)) } })
        .select('name')
    : [];
  const orgNames = new Map(orgs.map((o) => [String(o._id), o.name]));

  return found.map((contact) => {
    const organisationId = contact.organisationId ? String(contact.organisationId) : null;
    return {
      id: String(contact._id),
      name: contact.name,
      email: contact.email ?? null,
      mobile: contact.mobile ?? null,
      // A contact whose customer was archived is treated as unlinked.
      organisationId: organisationId && orgNames.has(organisationId) ? organisationId : null,
      organisationName: organisationId ? (orgNames.get(organisationId) ?? null) : null,
    };
  });
}

async function loadStaffEmails(tenantId: Types.ObjectId): Promise<string[]> {
  const [users, mailboxes] = await Promise.all([
    UserModel.find({ tenantId, deletedAt: null, role: { $in: [...STAFF_ROLES] } }).select('email'),
    ownEmailAddresses(tenantId).catch(() => [] as string[]),
  ]);
  return [...users.map((u) => u.email).filter(Boolean), ...mailboxes].map((e) =>
    String(e).toLowerCase(),
  );
}

export interface LinkTicketPeopleResult {
  added: number;
  created: number;
  moved: number;
  alreadyHere: number;
  ticketsLinked: number;
  /** People who belong to another customer; nothing is changed until the move is confirmed. */
  conflicts: { name: string; organisationName: string }[];
}

/**
 * Links the chosen people to a customer.
 *
 * A person with no CRM record gets one. A person who already belongs to another customer is only
 * moved when moveExisting is true; otherwise the whole request is refused with the list of
 * conflicts so the agent can confirm. Tickets from these people that have no customer yet are
 * attached to this customer. Tickets already filed under another customer stay there, so that
 * customer's history and reports do not change behind its back.
 */
export async function linkTicketPeople(
  organisationId: string,
  selections: TicketPersonSelection[],
  moveExisting: boolean,
): Promise<LinkTicketPeopleResult> {
  await connectToDatabase();
  const contacts = repository(ContactModel);
  const organisation = await repository(OrganisationModel).findById(organisationId);
  if (!organisation) throw new Error('Customer not found.');
  const target = organisation._id;
  const targetId = String(target);

  const resolved = await Promise.all(
    selections.map(async (selection) => {
      const contact = selection.contactId
        ? await contacts.findById(selection.contactId)
        : selection.email
          ? await contacts.findOne({ email: selection.email })
          : selection.phone
            ? await contacts.findOne({ mobile: selection.phone })
            : null;
      return { selection, contact };
    }),
  );

  // Contacts pointing at an archived customer are free to take.
  const otherOrgIds = [
    ...new Set(
      resolved
        .map((r) => r.contact?.organisationId)
        .filter((id): id is Types.ObjectId => Boolean(id) && String(id) !== targetId)
        .map(String),
    ),
  ];
  const otherOrgs = otherOrgIds.length
    ? await repository(OrganisationModel)
        .find({ _id: { $in: otherOrgIds.map((id) => toObjectId(id)) } })
        .select('name')
    : [];
  const otherNames = new Map(otherOrgs.map((o) => [String(o._id), o.name]));

  const conflicts = resolved
    .filter((r) => r.contact?.organisationId && otherNames.has(String(r.contact.organisationId)))
    .map((r) => ({
      name: r.contact!.name,
      organisationName: otherNames.get(String(r.contact!.organisationId))!,
    }));

  const result: LinkTicketPeopleResult = {
    added: 0,
    created: 0,
    moved: 0,
    alreadyHere: 0,
    ticketsLinked: 0,
    conflicts,
  };
  if (conflicts.length && !moveExisting) return result;

  for (const { selection, contact } of resolved) {
    let contactId: Types.ObjectId;
    let email = selection.email;
    let phone = selection.phone;

    if (contact) {
      contactId = contact._id;
      email = contact.email ?? email;
      phone = contact.mobile ?? phone;
      if (String(contact.organisationId) === targetId) {
        result.alreadyHere += 1;
      } else {
        const previous = contact.organisationId ? String(contact.organisationId) : null;
        const wasElsewhere = Boolean(previous && otherNames.has(previous));
        await contacts.updateOne(
          { _id: contact._id },
          {
            $set: {
              organisationId: target,
              // Branches and the primary flag belong to the old customer.
              ...(previous ? { locationId: null, isPrimary: false } : {}),
            },
          },
        );
        await recordAudit({
          action: wasElsewhere ? 'contact.moved' : 'contact.linked',
          entityType: 'Contact',
          entityId: contact._id,
          before: { organisationId: previous },
          after: { organisationId: targetId, source: 'tickets' },
        });
        result.added += 1;
        if (wasElsewhere) result.moved += 1;
      }
    } else {
      contactId = toObjectId(
        await createContact({
          organisationId: targetId,
          name: selection.name,
          email: selection.email ?? undefined,
          mobile: selection.phone ?? undefined,
        }),
      );
      result.added += 1;
      result.created += 1;
    }

    result.ticketsLinked += await attachTickets(target, contactId, email, phone);
  }

  if (result.added) {
    await recordAudit({
      action: 'customer.contacts.linked_from_tickets',
      entityType: 'Organisation',
      entityId: target,
      after: {
        added: result.added,
        created: result.created,
        moved: result.moved,
        ticketsLinked: result.ticketsLinked,
      },
    });
  }

  return result;
}

/** Files this person's customer-less tickets under the customer and fills in the contact. */
async function attachTickets(
  organisationId: Types.ObjectId,
  contactId: Types.ObjectId,
  email: string | null,
  phone: string | null,
): Promise<number> {
  const scope = repository(TicketModel).scope();
  const who = [
    { contactId },
    ...(email ? [{ requesterEmail: email }] : []),
    ...(phone ? [{ requesterPhone: phone }] : []),
  ];

  const filed = await TicketModel.updateMany(
    { ...scope, organisationId: null, $or: who },
    { $set: { organisationId } },
  );
  const byAddress = who.slice(1);
  if (byAddress.length) {
    await TicketModel.updateMany(
      { ...scope, organisationId, contactId: null, $or: byAddress },
      { $set: { contactId } },
    );
  }
  return filed.modifiedCount ?? 0;
}

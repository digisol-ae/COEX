import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { repository } from '@/lib/repository';
import { ContactModel } from '@coex/shared/crm/models/contact.model';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import { LocationModel } from '@coex/shared/crm/models/location.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { recordAudit } from '@/modules/core/services/audit.service';
import { TicketModel } from '@coex/shared/tickets/models/ticket.model';
import { normaliseCc, type CollaboratorOption } from '@coex/shared/tickets/collaborators';

export async function listCollaboratorOptions(): Promise<CollaboratorOption[]> {
  await connectToDatabase();
  const tenantId = getContext().tenantId;
  const [contacts, organisations, locations, users] = await Promise.all([
    ContactModel.find({ tenantId, deletedAt: null, status: 'active', email: { $ne: null } }).select(
      'name email organisationId locationId',
    ),
    OrganisationModel.find({ tenantId, deletedAt: null }).select('name email'),
    LocationModel.find({ tenantId, deletedAt: null }).select('name'),
    UserModel.find({
      tenantId,
      deletedAt: null,
      status: 'active',
      role: { $ne: 'client_contact' },
    }).select('name email'),
  ]);
  const customers = new Map(organisations.map((row) => [String(row._id), row.name]));
  const branches = new Map(locations.map((row) => [String(row._id), row.name]));
  return [
    ...contacts
      .filter((row) => row.email && customers.has(String(row.organisationId)))
      .map((row) => ({
        name: row.name,
        email: row.email!,
        source: [customers.get(String(row.organisationId)), branches.get(String(row.locationId))]
          .filter(Boolean)
          .join(' · '),
      })),
    ...organisations
      .filter((row) => row.email)
      .map((row) => ({ name: row.name, email: row.email!, source: 'Customer' })),
    ...users
      .filter((row) => row.email)
      .map((row) => ({ name: row.name, email: row.email, source: 'Team' })),
  ].sort((a, b) => a.name.localeCompare(b.name));
}

export async function setTicketCollaborators(ticketId: string, addresses: string[]): Promise<void> {
  await connectToDatabase();
  const tickets = repository(TicketModel);
  const ticket = await tickets.findById(ticketId);
  if (!ticket) throw new Error('Ticket not found.');
  const ccEmails = normaliseCc(addresses);
  await tickets.updateOne({ _id: ticket._id }, { $set: { ccEmails } });
  await recordAudit({
    action: 'ticket.collaborators.changed',
    entityType: 'Ticket',
    entityId: ticket._id,
    before: { ccEmails: ticket.ccEmails ?? [] },
    after: { ccEmails },
  });
}

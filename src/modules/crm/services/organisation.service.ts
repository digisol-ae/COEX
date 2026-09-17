import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { recordAudit, changedFields } from '@/modules/core/services/audit.service';
import { OrganisationModel } from '../models/organisation.model';
import { ContactModel } from '../models/contact.model';
import { LocationModel } from '../models/location.model';

/**
 * The customer master.
 *
 * Deleting is always a soft delete: a client record carries its whole support and project history,
 * and removing it would take that history with it.
 */

const organisations = () => repository(OrganisationModel);

export type OrganisationKind = 'client' | 'prospect' | 'supplier' | 'partner';

export interface OrganisationSummary {
  id: string;
  name: string;
  kind: OrganisationKind;
  industry: string | null;
  email: string | null;
  phone: string | null;
  contactCount: number;
  locationCount: number;
  status: string;
}

export async function listOrganisations(filter?: {
  search?: string;
  kind?: OrganisationKind;
}): Promise<OrganisationSummary[]> {
  await connectToDatabase();

  const query: Record<string, unknown> = {};

  if (filter?.kind) {
    query.kind = filter.kind;
  }

  if (filter?.search?.trim()) {
    // Escaped so a customer named "A+B (Ltd)" searches as text rather than as a pattern.
    const escaped = filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.name = { $regex: escaped, $options: 'i' };
  }

  const found = await organisations().find(query).sort({ name: 1 });

  return Promise.all(
    found.map(async (organisation) => ({
      id: String(organisation._id),
      name: organisation.name,
      kind: organisation.kind as OrganisationKind,
      industry: organisation.industry ?? null,
      email: organisation.email ?? null,
      phone: organisation.phone ?? null,
      contactCount: await ContactModel.countDocuments({
        tenantId: organisation.tenantId,
        organisationId: organisation._id,
        deletedAt: null,
      }),
      locationCount: await LocationModel.countDocuments({
        tenantId: organisation.tenantId,
        organisationId: organisation._id,
        deletedAt: null,
      }),
      status: organisation.status,
    })),
  );
}

export async function getOrganisation(id: string) {
  await connectToDatabase();
  return organisations().findById(id);
}

export interface OrganisationInput {
  name: string;
  kind: OrganisationKind;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  notes?: string;
  /** Values for the tenant's own field definitions, already validated by the CRM field service. */
  customFields?: Record<string, unknown>;
}

export async function createOrganisation(input: OrganisationInput): Promise<string> {
  await connectToDatabase();

  const created = await organisations().create({
    name: input.name.trim(),
    kind: input.kind,
    industry: input.industry?.trim() || null,
    website: input.website?.trim() || null,
    email: input.email?.trim().toLowerCase() || null,
    phone: input.phone?.trim() || null,
    address: input.address?.trim() || null,
    country: input.country || 'AE',
    notes: input.notes?.trim() || null,
  });

  await recordAudit({
    action: 'organisation.created',
    entityType: 'Organisation',
    entityId: created._id,
    after: { name: created.name, kind: created.kind },
  });

  return String(created._id);
}

export async function updateOrganisation(id: string, input: OrganisationInput): Promise<void> {
  await connectToDatabase();

  const before = await organisations().findById(id);
  if (!before) throw new Error('Customer not found.');

  const after = await organisations().updateOne(
    { _id: before._id },
    {
      $set: {
        name: input.name.trim(),
        kind: input.kind,
        industry: input.industry?.trim() || null,
        website: input.website?.trim() || null,
        email: input.email?.trim().toLowerCase() || null,
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        country: input.country || 'AE',
        notes: input.notes?.trim() || null,
        ...(input.customFields ? { customFields: input.customFields } : {}),
      },
    },
  );

  if (!after) throw new Error('Customer not found.');

  await recordAudit({
    action: 'organisation.updated',
    entityType: 'Organisation',
    entityId: before._id,
    ...changedFields(
      { name: before.name, kind: before.kind, email: before.email, phone: before.phone },
      { name: after.name, kind: after.kind, email: after.email, phone: after.phone },
    ),
  });
}

export async function archiveOrganisation(id: string): Promise<void> {
  await connectToDatabase();

  const removed = await organisations().softDelete({ _id: id });
  if (!removed) throw new Error('Customer not found.');

  await recordAudit({
    action: 'organisation.archived',
    entityType: 'Organisation',
    entityId: removed._id,
    before: { name: removed.name },
  });
}

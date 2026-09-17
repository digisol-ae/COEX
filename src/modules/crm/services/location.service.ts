import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { toObjectId } from '@/lib/ids';
import { recordAudit } from '@/modules/core/services/audit.service';
import { LocationModel } from '../models/location.model';

/** Branches and sites under a customer. Contracts attaches coverage here in a later phase. */

const locations = () => repository(LocationModel);

export interface LocationSummary {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  referenceCode: string | null;
  status: string;
}

export async function listLocations(organisationId: string): Promise<LocationSummary[]> {
  await connectToDatabase();

  const found = await locations().find({ organisationId }).sort({ name: 1 });

  return found.map((location) => ({
    id: String(location._id),
    name: location.name,
    city: location.city ?? null,
    address: location.address ?? null,
    phone: location.phone ?? null,
    referenceCode: location.referenceCode ?? null,
    status: location.status,
  }));
}

export interface LocationInput {
  organisationId: string;
  name: string;
  city?: string;
  address?: string;
  phone?: string;
  referenceCode?: string;
}

export async function createLocation(input: LocationInput): Promise<void> {
  await connectToDatabase();

  const created = await locations().create({
    organisationId: toObjectId(input.organisationId),
    name: input.name.trim(),
    city: input.city?.trim() || null,
    address: input.address?.trim() || null,
    phone: input.phone?.trim() || null,
    referenceCode: input.referenceCode?.trim() || null,
  });

  await recordAudit({
    action: 'location.created',
    entityType: 'Location',
    entityId: created._id,
    after: { name: created.name, city: created.city },
  });
}

export async function archiveLocation(id: string): Promise<void> {
  await connectToDatabase();

  const removed = await locations().softDelete({ _id: id });
  if (!removed) throw new Error('Location not found.');

  await recordAudit({
    action: 'location.archived',
    entityType: 'Location',
    entityId: removed._id,
    before: { name: removed.name },
  });
}

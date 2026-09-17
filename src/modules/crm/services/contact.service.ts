import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { toObjectId } from '@/lib/ids';
import { recordAudit } from '@/modules/core/services/audit.service';
import { ContactModel } from '../models/contact.model';
import { normaliseMobile } from '../phone';

/**
 * People inside a customer organisation.
 *
 * Mobile numbers are normalised to E.164 on the way in, because XVERSE matches inbound WhatsApp
 * messages by number and a mismatch only shows up months later as conversations that fail to
 * thread onto the right ticket.
 */

const contacts = () => repository(ContactModel);

export interface ContactSummary {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  mobile: string | null;
  isPrimary: boolean;
  status: string;
}

export async function listContacts(organisationId: string): Promise<ContactSummary[]> {
  await connectToDatabase();

  const found = await contacts().find({ organisationId }).sort({ isPrimary: -1, name: 1 });

  return found.map((contact) => ({
    id: String(contact._id),
    name: contact.name,
    title: contact.title ?? null,
    email: contact.email ?? null,
    mobile: contact.mobile ?? null,
    isPrimary: contact.isPrimary ?? false,
    status: contact.status,
  }));
}

export interface ContactInput {
  organisationId: string;
  name: string;
  title?: string;
  email?: string;
  mobile?: string;
  phone?: string;
  isPrimary?: boolean;
  country?: string;
}

export async function createContact(input: ContactInput): Promise<void> {
  await connectToDatabase();

  const mobile = normaliseMobile(input.mobile, input.country ?? 'AE');

  const created = await contacts().create({
    organisationId: toObjectId(input.organisationId),
    name: input.name.trim(),
    title: input.title?.trim() || null,
    email: input.email?.trim().toLowerCase() || null,
    mobile,
    phone: input.phone?.trim() || null,
    isPrimary: input.isPrimary ?? false,
  });

  if (created.isPrimary) {
    await demoteOtherPrimaries(input.organisationId, String(created._id));
  }

  await recordAudit({
    action: 'contact.created',
    entityType: 'Contact',
    entityId: created._id,
    after: { name: created.name, email: created.email, mobile: created.mobile },
  });
}

export async function archiveContact(id: string): Promise<void> {
  await connectToDatabase();

  const removed = await contacts().softDelete({ _id: id });
  if (!removed) throw new Error('Contact not found.');

  await recordAudit({
    action: 'contact.archived',
    entityType: 'Contact',
    entityId: removed._id,
    before: { name: removed.name },
  });
}

/** Only one contact per organisation is the default recipient for ticket replies. */
async function demoteOtherPrimaries(organisationId: string, keepId: string): Promise<void> {
  const others = await contacts().find({ organisationId, isPrimary: true });

  await Promise.all(
    others
      .filter((contact) => String(contact._id) !== keepId)
      .map((contact) => contacts().updateOne({ _id: contact._id }, { $set: { isPrimary: false } })),
  );
}

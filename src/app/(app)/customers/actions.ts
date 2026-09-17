'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { asUser, requirePermission } from '@/lib/session';
import {
  archiveOrganisation,
  createOrganisation,
  updateOrganisation,
  type OrganisationKind,
} from '@/modules/crm/services/organisation.service';
import { createContact, archiveContact } from '@/modules/crm/services/contact.service';
import { createLocation, archiveLocation } from '@/modules/crm/services/location.service';
import { recordActivity, type ActivityKind } from '@/modules/crm/services/activity.service';

export interface CrmFormState {
  error?: string;
  saved?: boolean;
}

const KINDS = ['client', 'prospect', 'supplier', 'partner'] as const;

function toKind(value: FormDataEntryValue | null): OrganisationKind {
  const kind = String(value ?? 'prospect');
  return (KINDS as readonly string[]).includes(kind) ? (kind as OrganisationKind) : 'prospect';
}

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? '').trim();
}

export async function createOrganisationAction(
  _previous: CrmFormState,
  formData: FormData,
): Promise<CrmFormState> {
  const actor = await requirePermission('customer.manage');

  let id: string;

  try {
    id = await asUser(actor, () =>
      createOrganisation({
        name: text(formData, 'name'),
        kind: toKind(formData.get('kind')),
        industry: text(formData, 'industry'),
        email: text(formData, 'email'),
        phone: text(formData, 'phone'),
        website: text(formData, 'website'),
        address: text(formData, 'address'),
      }),
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not create the customer.' };
  }

  revalidatePath('/customers');
  redirect(`/customers/${id}`);
}

export async function updateOrganisationAction(
  _previous: CrmFormState,
  formData: FormData,
): Promise<CrmFormState> {
  const actor = await requirePermission('customer.manage');
  const id = text(formData, 'id');

  try {
    await asUser(actor, () =>
      updateOrganisation(id, {
        name: text(formData, 'name'),
        kind: toKind(formData.get('kind')),
        industry: text(formData, 'industry'),
        email: text(formData, 'email'),
        phone: text(formData, 'phone'),
        website: text(formData, 'website'),
        address: text(formData, 'address'),
        notes: text(formData, 'notes'),
      }),
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the customer.' };
  }

  revalidatePath(`/customers/${id}`);
  return { saved: true };
}

export async function archiveOrganisationAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('customer.manage');

  await asUser(actor, () => archiveOrganisation(text(formData, 'id')));

  revalidatePath('/customers');
  redirect('/customers');
}

export async function addContactAction(
  _previous: CrmFormState,
  formData: FormData,
): Promise<CrmFormState> {
  const actor = await requirePermission('customer.manage');
  const organisationId = text(formData, 'organisationId');

  try {
    await asUser(actor, () =>
      createContact({
        organisationId,
        name: text(formData, 'name'),
        title: text(formData, 'title'),
        email: text(formData, 'email'),
        mobile: text(formData, 'mobile'),
        isPrimary: formData.get('isPrimary') === 'on',
      }),
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not add the contact.' };
  }

  revalidatePath(`/customers/${organisationId}`);
  return { saved: true };
}

export async function archiveContactAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('customer.manage');

  await asUser(actor, () => archiveContact(text(formData, 'id')));

  revalidatePath(`/customers/${text(formData, 'organisationId')}`);
}

export async function addLocationAction(
  _previous: CrmFormState,
  formData: FormData,
): Promise<CrmFormState> {
  const actor = await requirePermission('customer.manage');
  const organisationId = text(formData, 'organisationId');

  try {
    await asUser(actor, () =>
      createLocation({
        organisationId,
        name: text(formData, 'name'),
        city: text(formData, 'city'),
        address: text(formData, 'address'),
        phone: text(formData, 'phone'),
        referenceCode: text(formData, 'referenceCode'),
      }),
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not add the location.' };
  }

  revalidatePath(`/customers/${organisationId}`);
  return { saved: true };
}

export async function archiveLocationAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('customer.manage');

  await asUser(actor, () => archiveLocation(text(formData, 'id')));

  revalidatePath(`/customers/${text(formData, 'organisationId')}`);
}

const LOGGABLE: ActivityKind[] = ['note', 'call', 'meeting', 'email'];

export async function logActivityAction(
  _previous: CrmFormState,
  formData: FormData,
): Promise<CrmFormState> {
  const actor = await requirePermission('customer.manage');
  const organisationId = text(formData, 'organisationId');
  const kind = String(formData.get('kind') ?? 'note') as ActivityKind;

  if (!LOGGABLE.includes(kind)) {
    return { error: 'That entry type cannot be added by hand.' };
  }

  const summary = text(formData, 'summary');

  if (!summary) {
    return { error: 'Write a short summary of what happened.' };
  }

  try {
    await asUser(actor, () =>
      recordActivity({
        organisationId,
        kind,
        summary,
        body: text(formData, 'body') || null,
        direction: kind === 'note' ? 'internal' : 'outbound',
        sourceModule: 'crm',
      }),
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not add the entry.' };
  }

  revalidatePath(`/customers/${organisationId}`);
  return { saved: true };
}

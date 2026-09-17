'use server';

import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import { updateTenantSettings } from '@/modules/core/services/tenant.service';

/** A time input gives 09:30; the calendar works in minutes from midnight. */
function toMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export interface TenantFormState {
  error?: string;
  saved?: boolean;
}

export async function saveTenantSettingsAction(
  _previous: TenantFormState,
  formData: FormData,
): Promise<TenantFormState> {
  const actor = await requirePermission('tenant.manage');

  try {
    await asUser(actor, () =>
      updateTenantSettings({
        name: String(formData.get('name') ?? ''),
        timezone: String(formData.get('timezone') ?? ''),
        currency: String(formData.get('currency') ?? ''),
        taskPrefix: String(formData.get('taskPrefix') ?? ''),
        ticketPrefix: String(formData.get('ticketPrefix') ?? ''),
        attachmentRetentionMonths: Number(formData.get('attachmentRetentionMonths') ?? 24),
        workingDays: formData.getAll('workingDays').map(Number),
        dayStartMinutes: toMinutes(String(formData.get('dayStart') ?? '09:00')),
        dayEndMinutes: toMinutes(String(formData.get('dayEnd') ?? '18:00')),
      }),
    );

    revalidatePath('/setup/tenant');

    return { saved: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the settings.' };
  }
}

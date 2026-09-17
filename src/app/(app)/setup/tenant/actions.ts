'use server';

import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import { updateTenantSettings } from '@/modules/core/services/tenant.service';

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
      }),
    );

    revalidatePath('/setup/tenant');

    return { saved: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the settings.' };
  }
}

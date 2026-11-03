'use server';

import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import { updateTenantSettings } from '@/modules/core/services/tenant.service';
import sharp from 'sharp';

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
    const logo = formData.get('letterheadLogo');
    let logoDataUrl: string | undefined;
    if (logo instanceof File && logo.size > 0) {
      if (logo.size > 2 * 1024 * 1024) throw new Error('Use a letterhead logo of at most 2 MB.');
      const image = sharp(Buffer.from(await logo.arrayBuffer()), { limitInputPixels: 16000000 });
      const metadata = await image.metadata();
      if (!['png', 'jpeg', 'webp'].includes(metadata.format ?? ''))
        throw new Error('Use a PNG, JPEG or WebP letterhead logo.');
      const data = await image
        .rotate()
        .resize({ width: 1000, height: 240, fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer();
      logoDataUrl = `data:image/png;base64,${data.toString('base64')}`;
    }
    await asUser(actor, () =>
      updateTenantSettings({
        name: String(formData.get('name') ?? ''),
        timezone: String(formData.get('timezone') ?? ''),
        currency: String(formData.get('currency') ?? ''),
        taskPrefix: String(formData.get('taskPrefix') ?? ''),
        ticketPrefix: String(formData.get('ticketPrefix') ?? ''),
        leadPrefix: String(formData.get('leadPrefix') ?? ''),
        opportunityPrefix: String(formData.get('opportunityPrefix') ?? ''),
        leadSources: [
          ...new Set(
            String(formData.get('leadSources') ?? '')
              .split('\n')
              .map((source) => source.trim())
              .filter(Boolean),
          ),
        ],
        attachmentRetentionMonths: Number(formData.get('attachmentRetentionMonths') ?? 24),
        workingDays: formData.getAll('workingDays').map(Number),
        dayStartMinutes: toMinutes(String(formData.get('dayStart') ?? '09:00')),
        dayEndMinutes: toMinutes(String(formData.get('dayEnd') ?? '18:00')),
        letterhead: {
          address: String(formData.get('letterheadAddress') ?? ''),
          contact: String(formData.get('letterheadContact') ?? ''),
          footer: String(formData.get('letterheadFooter') ?? ''),
          color: String(formData.get('letterheadColor') ?? '#0f172a'),
          logoDataUrl,
        },
      }),
    );

    revalidatePath('/setup/tenant');
    revalidatePath('/contracts', 'layout');

    return { saved: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the settings.' };
  }
}

'use server';

import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import { createTenant } from '@/modules/core/services/tenant.service';

export interface TenantCreateState {
  error?: string;
  password?: string;
  email?: string;
}

export async function createTenantAction(
  _previous: TenantCreateState,
  formData: FormData,
): Promise<TenantCreateState> {
  const actor = await requirePermission('tenant.create');

  try {
    const adminEmail = String(formData.get('adminEmail') ?? '');

    const { password } = await asUser(actor, () =>
      createTenant({
        name: String(formData.get('name') ?? ''),
        slug: String(formData.get('slug') ?? ''),
        adminName: String(formData.get('adminName') ?? ''),
        adminEmail,
      }),
    );

    revalidatePath('/setup/tenants');

    return { password, email: adminEmail };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not create the tenant.' };
  }
}

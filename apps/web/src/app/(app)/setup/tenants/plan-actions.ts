'use server';
import { asUser, requirePermission } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import {
  publishSubscriptionPlan,
  archiveSubscriptionPlan,
} from '@/modules/core/services/plan-catalogue.service';
export async function planAction(
  _state: { error?: string; saved?: boolean },
  form: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const actor = await requirePermission('tenant.create');
  try {
    await asUser(actor, async () => {
      const reason = String(form.get('reason') ?? '');
      if (form.get('operation') === 'archive') {
        await archiveSubscriptionPlan(String(form.get('planId')), reason);
      } else if (form.get('operation') === 'publish') {
        await publishSubscriptionPlan({
          modules: {
            tasks: form.get('module_tasks') === 'on',
            tickets: form.get('module_tickets') === 'on',
            crm: form.get('module_crm') === 'on',
          },
          code: String(form.get('code') ?? ''),
          name: String(form.get('name') ?? ''),
          version: Number(form.get('version')),
          currency: String(form.get('currency') ?? ''),
          price: String(form.get('price') ?? ''),
          interval: String(form.get('interval')),
          seats: Number(form.get('seats')),
          storageLimitBytes: Number(form.get('storageGB')) * 1_000_000_000,
          reason,
        });
      } else throw new Error('Unknown plan operation.');
    });
    revalidatePath('/setup/tenants');
    return { saved: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the plan.' };
  }
}

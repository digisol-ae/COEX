'use server';

import { setTenantModules } from '@/modules/core/services/module-admin.service';
import { assignSubscriptionPlan } from '@/modules/core/services/plan-catalogue.service';
import { setTenantSubscription } from '@/modules/core/services/subscription.service';
import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import { createTenant } from '@/modules/core/services/tenant.service';
import { extendTenantTrial, setTenantStorageLimit } from '@/modules/core/services/tenant.service';
import { updateProvisioningDefaults } from '@/modules/core/services/platform-settings.service';
import {
  setRegistrationEnabled,
  reviewTrialApplication,
} from '@/modules/core/services/trial-registration.service';

export async function registrationSettingsAction(
  _state: PlatformChangeState,
  form: FormData,
): Promise<PlatformChangeState> {
  const actor = await requirePermission('tenant.create');
  try {
    await asUser(actor, () => setRegistrationEnabled(form.get('enabled') === 'on'));
    revalidatePath('/setup/tenants');
    revalidatePath('/register');
    return { saved: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Could not save registration settings.',
    };
  }
}

export async function reviewApplicationAction(
  _state: PlatformChangeState,
  form: FormData,
): Promise<PlatformChangeState> {
  const actor = await requirePermission('tenant.create');
  try {
    await asUser(actor, () =>
      reviewTrialApplication(
        String(form.get('applicationId') ?? ''),
        String(form.get('decision')) as 'approve' | 'reject',
        String(form.get('note') ?? ''),
      ),
    );
    revalidatePath('/setup/tenants');
    return { saved: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not review the application.' };
  }
}

export interface PlatformChangeState {
  error?: string;
  saved?: boolean;
}

export async function platformChangeAction(
  _previous: PlatformChangeState,
  form: FormData,
): Promise<PlatformChangeState> {
  const actor = await requirePermission('tenant.create');
  try {
    await asUser(actor, async () => {
      const operation = String(form.get('operation') ?? '');
      const storageLimitBytes = Number(form.get('storageGB')) * 1_000_000_000;
      if (operation === 'defaults') {
        await updateProvisioningDefaults({
          trialDays: Number(form.get('trialDays')),
          storageLimitBytes,
        });
      } else if (operation === 'modules') {
        await setTenantModules(
          String(form.get('tenantId')),
          {
            tasks: form.get('module_tasks') === 'on',
            tickets: form.get('module_tickets') === 'on',
            crm: form.get('module_crm') === 'on',
          },
          String(form.get('reason') ?? ''),
        );
      } else if (operation === 'assign-plan') {
        await assignSubscriptionPlan({
          tenantId: String(form.get('tenantId')),
          planId: String(form.get('planId')),
          accessEndsAt: String(form.get('accessEndsAt') ?? ''),
          reason: String(form.get('reason') ?? ''),
        });
      } else if (operation === 'subscription') {
        await setTenantSubscription({
          tenantId: String(form.get('tenantId')),
          plan: String(form.get('plan') ?? ''),
          seats: Number(form.get('seats')),
          status: String(form.get('subscriptionStatus')) as 'active' | 'past_due' | 'canceled',
          accessEndsAt: String(form.get('accessEndsAt') ?? ''),
          reason: String(form.get('reason') ?? ''),
        });
      } else if (operation === 'storage') {
        await setTenantStorageLimit(
          String(form.get('tenantId')),
          storageLimitBytes,
          String(form.get('reason') ?? ''),
        );
      } else if (operation === 'extend') {
        await extendTenantTrial(
          String(form.get('tenantId')),
          Number(form.get('days')),
          String(form.get('reason') ?? ''),
        );
      } else throw new Error('Unknown operation.');
    });
    revalidatePath('/setup/tenants');
    revalidatePath('/setup/tenant');
    return { saved: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the change.' };
  }
}

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

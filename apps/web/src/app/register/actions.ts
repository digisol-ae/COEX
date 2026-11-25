'use server';
import { headers } from 'next/headers';
import { verifyCaptcha } from '@/lib/captcha';
import {
  applyForTrial,
  verifyTrialEmail,
  activateTrialAdministrator,
  resendTrialActivation,
} from '@/modules/core/services/trial-registration.service';
export interface RegistrationState {
  error?: string;
  done?: boolean;
}
async function ipAddress() {
  return (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}
export async function applyAction(
  _state: RegistrationState,
  form: FormData,
): Promise<RegistrationState> {
  if (String(form.get('website') ?? '')) return { done: true };
  try {
    await verifyCaptcha(form, 'register');
    await applyForTrial(
      {
        companyName: String(form.get('companyName') ?? ''),
        adminName: String(form.get('adminName') ?? ''),
        email: String(form.get('email') ?? ''),
        slug: String(form.get('slug') ?? ''),
      },
      await ipAddress(),
    );
    return { done: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not submit the application.' };
  }
}
export async function verifyEmailAction(
  _state: RegistrationState,
  form: FormData,
): Promise<RegistrationState> {
  try {
    await verifyTrialEmail(String(form.get('token') ?? ''));
    return { done: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not verify the email.' };
  }
}
export async function activateAdministratorAction(
  _state: RegistrationState,
  form: FormData,
): Promise<RegistrationState> {
  if (form.get('password') !== form.get('confirm')) return { error: 'The passwords do not match.' };
  try {
    await activateTrialAdministrator(
      String(form.get('token') ?? ''),
      String(form.get('password') ?? ''),
    );
    return { done: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not activate the account.' };
  }
}
export async function resendActivationAction(
  _state: RegistrationState,
  form: FormData,
): Promise<RegistrationState> {
  try {
    await verifyCaptcha(form, 'trial_activation');
    await resendTrialActivation(String(form.get('email') ?? ''), await ipAddress());
    return { done: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not request a new link.' };
  }
}

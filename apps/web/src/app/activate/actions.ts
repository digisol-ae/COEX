'use server';
import { verifyCaptcha } from '@/lib/captcha';
import {
  requestActivation,
  verifyActivation,
  finishActivation,
} from '@/modules/core/services/activation.service';
export interface ActivationState {
  step?: 'code' | 'password' | 'done';
  email?: string;
  token?: string;
  error?: string;
}
export async function activationAction(
  previous: ActivationState,
  form: FormData,
): Promise<ActivationState> {
  try {
    const email = String(form.get('email') ?? '')
      .trim()
      .toLowerCase();
    const step = String(form.get('step') ?? 'request');
    if (step === 'request') {
      await verifyCaptcha(form, 'activation');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error('Enter a valid email address.');
      await requestActivation(email);
      return { step: 'code', email };
    }
    if (step === 'code')
      return {
        step: 'password',
        email,
        token: await verifyActivation(email, String(form.get('code') ?? '')),
      };
    if (step === 'password') {
      const password = String(form.get('password') ?? '');
      if (password !== form.get('confirm')) throw new Error('Passwords do not match.');
      await finishActivation(String(form.get('token') ?? ''), password);
      return { step: 'done' };
    }
    throw new Error('Invalid activation step.');
  } catch (error) {
    return { ...previous, error: error instanceof Error ? error.message : 'Activation failed.' };
  }
}

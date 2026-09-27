'use server';

import { requestPasswordReset } from '@/modules/core/services/password-reset.service';

export interface ForgotState {
  sent?: boolean;
}

/**
 * Always answers the same way, whether or not the address has an account, so this page cannot be
 * used to find out who works at DigiSol.
 */
export async function forgotPasswordAction(
  _previous: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const email = String(formData.get('email') ?? '').trim();
  if (email) await requestPasswordReset(email);
  return { sent: true };
}

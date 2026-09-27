'use server';

import { resetPasswordWithToken } from '@/modules/core/services/password-reset.service';

export interface ResetState {
  error?: string;
  done?: boolean;
}

export async function resetPasswordAction(
  _previous: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const password = String(formData.get('password') ?? '');
  if (password !== String(formData.get('confirm') ?? '')) {
    return { error: 'The two passwords do not match.' };
  }
  try {
    await resetPasswordWithToken(String(formData.get('token') ?? ''), password);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not set the password.' };
  }
  return { done: true };
}

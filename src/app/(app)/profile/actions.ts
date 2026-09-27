'use server';

import { revalidatePath } from 'next/cache';
import { asUser, requireUser } from '@/lib/session';
import { updateMyProfile } from '@/modules/core/services/user.service';
import { requestPasswordReset } from '@/modules/core/services/password-reset.service';

export interface ProfileFormState {
  error?: string;
  saved?: boolean;
}

export async function updateProfileAction(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireUser();
  try {
    await asUser(user, () =>
      updateMyProfile({
        name: String(formData.get('name') ?? ''),
        title: String(formData.get('title') ?? ''),
      }),
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save your profile.' };
  }
  // The name shows in the header on every page.
  revalidatePath('/', 'layout');
  return { saved: true };
}

/** Sends the signed-in person a link to change their password, at their registered email. */
export async function emailPasswordLinkAction(): Promise<ProfileFormState> {
  const user = await requireUser();
  const result = await requestPasswordReset(user.email);
  if (result === 'sent') return { saved: true };
  if (result === 'too_many') {
    return { error: 'Three links were sent in the last hour. Use one of those, or try later.' };
  }
  if (result === 'email_off') {
    return {
      error: 'COEX cannot send email yet. Ask an administrator to set it up in Setup, Email.',
    };
  }
  return { error: 'Could not send the link.' };
}

'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { asUser, requireUser } from '@/lib/session';
import { SESSION_COOKIE } from '@/modules/core/services/session.service';
import { changeMyPassword, updateMyProfile } from '@/modules/core/services/user.service';

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

export async function changePasswordAction(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireUser();
  const next = String(formData.get('next') ?? '');
  if (next !== String(formData.get('confirm') ?? '')) {
    return { error: 'The two new passwords do not match.' };
  }
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? '';
  try {
    await asUser(user, () =>
      changeMyPassword({
        current: String(formData.get('current') ?? ''),
        next,
        keepSessionToken: token,
      }),
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not change your password.' };
  }
  return { saved: true };
}

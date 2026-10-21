'use server';
import { revalidatePath } from 'next/cache';
import { asUser, requireUser } from '@/lib/session';
import { portalIdentity } from '@/modules/portal/service';
import { updateMyProfile } from '@/modules/core/services/user.service';
export async function updatePortalProfile(
  _state: { error?: string; saved?: boolean },
  form: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const user = await requireUser();
  if (user.role !== 'client_contact') return { error: 'Not allowed.' };
  try {
    await asUser(user, async () => {
      await portalIdentity();
      await updateMyProfile({
        name: String(form.get('name') ?? ''),
        title: String(form.get('title') ?? ''),
      });
    });
    revalidatePath('/portal', 'layout');
    return { saved: true };
  } catch {
    return { error: 'Could not save your profile.' };
  }
}

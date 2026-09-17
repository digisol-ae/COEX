'use server';

import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import {
  createUser,
  resetPassword,
  setUserStatus,
  updateUserRole,
} from '@/modules/core/services/user.service';
import { ROLES, type Role } from '@/modules/core/permissions';

export interface UserFormState {
  error?: string;
  createdPassword?: string;
  createdEmail?: string;
  message?: string;
}

function toRole(value: FormDataEntryValue | null): Role {
  const role = String(value ?? '');

  if (!(ROLES as readonly string[]).includes(role)) {
    throw new Error('Unknown role.');
  }

  return role as Role;
}

export async function createUserAction(
  _previous: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const actor = await requirePermission('user.manage');

  try {
    const email = String(formData.get('email') ?? '');

    const { password } = await asUser(actor, () =>
      createUser({
        name: String(formData.get('name') ?? ''),
        email,
        title: String(formData.get('title') ?? ''),
        role: toRole(formData.get('role')),
      }),
    );

    revalidatePath('/admin/users');

    return { createdPassword: password, createdEmail: email };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not create the user.' };
  }
}

export async function changeRoleAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('user.manage');

  await asUser(actor, () =>
    updateUserRole(String(formData.get('userId') ?? ''), toRole(formData.get('role'))),
  );

  revalidatePath('/admin/users');
}

export async function toggleStatusAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('user.manage');
  const status = String(formData.get('status') ?? '') === 'active' ? 'suspended' : 'active';

  await asUser(actor, () => setUserStatus(String(formData.get('userId') ?? ''), status));

  revalidatePath('/admin/users');
}

export async function resetPasswordAction(
  _previous: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const actor = await requirePermission('user.manage');

  try {
    const { password } = await asUser(actor, () =>
      resetPassword(String(formData.get('userId') ?? '')),
    );

    revalidatePath('/admin/users');

    return { createdPassword: password, createdEmail: String(formData.get('email') ?? '') };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not reset the password.' };
  }
}

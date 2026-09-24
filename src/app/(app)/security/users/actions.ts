'use server';

import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import {
  createUser,
  resetPassword,
  setUserStatus,
  updateUserAccess,
  updateUserRole,
} from '@/modules/core/services/user.service';
import { PERMISSIONS, ROLES, type Permission, type Role } from '@/modules/core/permissions';

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

    revalidatePath('/security/users');

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

  revalidatePath('/security/users');
}

export async function toggleStatusAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('user.manage');
  const status = String(formData.get('status') ?? '') === 'active' ? 'suspended' : 'active';

  await asUser(actor, () => setUserStatus(String(formData.get('userId') ?? ''), status));

  revalidatePath('/security/users');
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

    revalidatePath('/security/users');

    return { createdPassword: password, createdEmail: String(formData.get('email') ?? '') };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not reset the password.' };
  }
}

/**
 * Each permission arrives as `perm_<id>` set to `allow`, `deny`, or left as the role's own
 * default when the field is absent, which the three-way radio group in the editor guarantees is
 * always one of exactly those.
 */
export async function updateUserAccessAction(
  _previous: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const actor = await requirePermission('user.manage');
  const userId = String(formData.get('userId') ?? '');

  const grants: Permission[] = [];
  const denials: Permission[] = [];

  for (const permission of PERMISSIONS) {
    const choice = formData.get(`perm_${permission}`);
    if (choice === 'allow') grants.push(permission);
    else if (choice === 'deny') denials.push(permission);
  }

  try {
    await asUser(actor, () => updateUserAccess(userId, { grants, denials }));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save access.' };
  }

  revalidatePath('/security/users');
  return { message: 'Access updated.' };
}

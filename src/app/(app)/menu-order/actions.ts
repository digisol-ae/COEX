'use server';

import { revalidatePath } from 'next/cache';
import { asUser, requireUser } from '@/lib/session';
import { GROUPS } from '@/components/navigation/navigation';
import { saveNavigationOrder } from '@/modules/core/services/user.service';

export async function saveMenuOrderAction(order: string[]): Promise<{ error?: string }> {
  const user = await requireUser();
  const known = new Set(GROUPS.map((group) => group.id));

  try {
    await asUser(user, () => saveNavigationOrder(order.filter((id) => known.has(id))));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the menu order.' };
  }

  // The menu is part of the layout every signed in page shares.
  revalidatePath('/', 'layout');
  return {};
}

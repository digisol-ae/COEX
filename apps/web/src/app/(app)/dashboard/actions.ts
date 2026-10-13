'use server';
import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import {
  finishMyDesk,
  setDeskTaskSelected,
  toggleDeskTask,
} from '@/modules/tasks/services/desk.service';

export async function toggleDeskTaskAction(taskId: string) {
  const user = await requirePermission('task.read.own');
  await asUser(user, () => toggleDeskTask(taskId));
  revalidatePath('/my-desk');
  revalidatePath('/tasks');
}
export async function finishDeskAction() {
  const user = await requirePermission('task.read.own');
  const result = await asUser(user, () => finishMyDesk());
  revalidatePath('/', 'layout');
  return result;
}

export async function setDeskTaskAction(
  taskId: string,
  selected: boolean,
): Promise<{ error?: string }> {
  const user = await requirePermission('task.read.own');
  try {
    await asUser(user, () => setDeskTaskSelected(taskId, selected));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not update My Desk.' };
  }
  revalidatePath('/', 'layout');
  return {};
}

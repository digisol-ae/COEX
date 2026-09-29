'use server';
import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import { finishMyDesk, toggleDeskTask } from '@/modules/tasks/services/desk.service';

export async function toggleDeskTaskAction(taskId: string) { const user = await requirePermission('task.read.own'); await asUser(user, () => toggleDeskTask(taskId)); revalidatePath('/my-desk'); revalidatePath('/tasks'); }
export async function finishDeskAction() { const user = await requirePermission('task.read.own'); const result = await asUser(user, () => finishMyDesk()); revalidatePath('/my-desk'); return result; }

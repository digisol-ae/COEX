'use server';
import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import { saveGanttSchedule, type GanttScheduleInput } from '@/modules/tasks/services/gantt.service';
export async function saveGanttScheduleAction(input: GanttScheduleInput) {
  const actor = await requirePermission('task.manage');
  try {
    const saved = await asUser(actor, () => saveGanttSchedule(input));
    for (const path of [
      `/spaces/${input.spaceId}`,
      `/tasks/${input.id}`,
      '/tasks',
      '/dashboard',
      '/personal',
      '/my-desk',
    ])
      revalidatePath(path);
    return { saved: true, ...saved };
  } catch (error) {
    return {
      saved: false,
      error: error instanceof Error ? error.message : 'Could not save task dates.',
    };
  }
}

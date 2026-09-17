'use server';

import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import {
  addManualEntry,
  removeEntry,
  startTimer,
  stopTimer,
  updateEntry,
} from '@/modules/time/services/time.service';
import { lockWeek, unlockWeek } from '@/modules/time/services/timesheet.service';
import { parseDuration } from '@/modules/time/week';

export interface TimeFormState {
  error?: string;
  saved?: boolean;
}

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? '').trim();
}

export async function startTimerAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('task.read.own');

  await asUser(actor, () => startTimer(text(formData, 'taskId')));

  revalidatePath('/', 'layout');
}

export async function stopTimerAction(): Promise<void> {
  const actor = await requirePermission('task.read.own');

  await asUser(actor, () => stopTimer());

  revalidatePath('/', 'layout');
}

export async function addTimeAction(
  _previous: TimeFormState,
  formData: FormData,
): Promise<TimeFormState> {
  const actor = await requirePermission('task.read.own');

  const duration = parseDuration(text(formData, 'duration'));

  if (!duration) {
    return { error: 'Write the time as 1.5, 1:30 or 90m.' };
  }

  try {
    await asUser(actor, () =>
      addManualEntry({
        taskId: text(formData, 'taskId'),
        workDate: text(formData, 'workDate'),
        duration,
        note: text(formData, 'note'),
        billable: formData.get('billable') !== null,
      }),
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not add the time.' };
  }

  revalidatePath('/time');
  revalidatePath(`/tasks/${text(formData, 'taskId')}`);
  return { saved: true };
}

export async function updateTimeAction(
  _previous: TimeFormState,
  formData: FormData,
): Promise<TimeFormState> {
  const actor = await requirePermission('task.read.own');

  const duration = parseDuration(text(formData, 'duration'));

  if (!duration) {
    return { error: 'Write the time as 1.5, 1:30 or 90m.' };
  }

  try {
    await asUser(actor, () =>
      updateEntry(text(formData, 'id'), {
        duration,
        note: text(formData, 'note'),
        billable: formData.get('billable') !== null,
      }),
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the change.' };
  }

  revalidatePath('/time');
  return { saved: true };
}

export async function removeTimeAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('task.read.own');

  await asUser(actor, () => removeEntry(text(formData, 'id')));

  revalidatePath('/time');
}

export async function lockWeekAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('tenant.manage');

  await asUser(actor, () => lockWeek(new Date(text(formData, 'weekStart'))));

  revalidatePath('/time');
}

export async function unlockWeekAction(
  _previous: TimeFormState,
  formData: FormData,
): Promise<TimeFormState> {
  const actor = await requirePermission('tenant.manage');

  try {
    await asUser(actor, () =>
      unlockWeek(new Date(text(formData, 'weekStart')), text(formData, 'reason')),
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not unlock the week.' };
  }

  revalidatePath('/time');
  return { saved: true };
}

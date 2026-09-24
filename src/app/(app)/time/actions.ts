'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { asUser, requirePermission, requireUser } from '@/lib/session';
import {
  addManualEntry,
  removeEntry,
  startTicketTimer,
  startTimer,
  stopTimer,
  updateEntry,
} from '@/modules/time/services/time.service';
import { lockWeek, unlockWeek } from '@/modules/time/services/timesheet.service';
import { formatMinutes, parseDuration } from '@/modules/time/week';
import { historyFor } from '@/modules/core/services/audit.service';

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

export async function startTicketTimerAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('ticket.read.own');

  await asUser(actor, () => startTicketTimer(text(formData, 'ticketId')));

  revalidatePath('/', 'layout');
}

export async function stopTimerAction(): Promise<void> {
  // Whichever timer is running, task or ticket, only one of the two matching permissions may be
  // held by the person who started it: a support only role can hold ticket.read.own without
  // task.read.own now that access is editable per person, and that person still has to be able
  // to press stop on their own running ticket timer.
  const actor = await requireUser();

  if (!actor.permissions.includes('task.read.own') && !actor.permissions.includes('ticket.read.own')) {
    redirect('/dashboard?denied=task.read.own');
  }

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
        workDate: text(formData, 'workDate') || undefined,
        taskId: text(formData, 'taskId') || undefined,
        mayEditOthers: actor.permissions.includes('tenant.manage'),
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

  await asUser(actor, () =>
    removeEntry(text(formData, 'id'), actor.permissions.includes('tenant.manage')),
  );

  revalidatePath('/time');
}

/**
 * Saving a correction from the row itself.
 *
 * Takes arguments rather than FormData because the row closes itself on success, and that needs an
 * answer it can act on rather than a page it has to wait for.
 */
export async function saveEntryAction(input: {
  id: string;
  duration: string;
  note: string;
  billable: boolean;
  workDate: string;
  taskId: string;
}): Promise<TimeFormState> {
  const actor = await requirePermission('task.read.own');

  const duration = parseDuration(input.duration);
  if (!duration) return { error: 'Write the time as 1.5, 1:30 or 90m.' };

  try {
    await asUser(actor, () =>
      updateEntry(input.id, {
        duration,
        note: input.note,
        billable: input.billable,
        workDate: input.workDate || undefined,
        taskId: input.taskId || undefined,
        mayEditOthers: actor.permissions.includes('tenant.manage'),
      }),
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the change.' };
  }

  revalidatePath('/time');
  revalidatePath('/time/report');
  revalidatePath(`/tasks/${input.taskId}`);
  return { saved: true };
}

/**
 * The history of one entry, read on demand.
 *
 * Fetched when somebody opens it rather than with the week, because a timesheet with forty rows
 * would otherwise carry forty histories nobody asked for.
 */
export async function entryHistoryAction(entryId: string): Promise<{
  rows: { id: string; action: string; at: string; actorName: string; summary: string }[];
}> {
  const actor = await requirePermission('task.read.own');

  const rows = await asUser(actor, () => historyFor('TimeEntry', entryId));

  return {
    rows: rows.map((row) => ({
      id: row.id,
      action: row.action,
      at: row.at.toISOString(),
      actorName: row.actorName,
      summary: describeChanges(row.action, row.changes),
    })),
  };
}

const FIELD_LABELS: Record<string, string> = {
  minutes: 'time',
  note: 'note',
  billable: 'billable',
  day: 'day',
  task: 'task',
  onBehalfOf: 'on behalf of',
};

/** The log in a sentence, because "minutes: 90 to 120" is data, not an explanation. */
function describeChanges(
  action: string,
  changes: { field: string; from: unknown; to: unknown }[],
): string {
  if (action === 'time.entry_added') return 'Added';
  if (action === 'time.entry_removed') return 'Removed';
  if (action === 'time.timer_started') return 'Timer started';
  if (action === 'time.timer_stopped') return 'Timer stopped';

  const described = changes
    .filter((change) => change.field !== 'onBehalfOf' && change.field !== 'task')
    .map((change) => {
      const label = FIELD_LABELS[change.field] ?? change.field;

      if (change.field === 'minutes') {
        return `time ${formatMinutes(Number(change.from ?? 0))} to ${formatMinutes(Number(change.to ?? 0))}`;
      }

      if (change.field === 'billable') {
        return change.to ? 'marked billable' : 'marked not billable';
      }

      if (change.field === 'note') {
        return change.to ? `note set to "${String(change.to)}"` : 'note cleared';
      }

      return `${label} ${String(change.from ?? 'nothing')} to ${String(change.to ?? 'nothing')}`;
    });

  if (changes.some((change) => change.field === 'task')) described.push('moved to another task');

  return described.length > 0 ? described.join(', ') : 'Edited';
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

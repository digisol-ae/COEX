'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { asUser, requirePermission } from '@/lib/session';
import {
  addDocumentLink,
  addSubtask,
  archiveTask,
  createTask,
  moveTask,
  moveTaskToPosition,
  removeDocumentLink,
  toggleSubtask,
  updateTask,
  type Priority,
} from '@/modules/tasks/services/task.service';
import { createProject, updateProjectPhases } from '@/modules/tasks/services/project.service';

export interface TaskFormState {
  error?: string;
  saved?: boolean;
}

const PRIORITIES = ['urgent', 'high', 'normal', 'low'] as const;

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? '').trim();
}

function toPriority(value: string): Priority {
  return (PRIORITIES as readonly string[]).includes(value) ? (value as Priority) : 'normal';
}

function assigneesFrom(formData: FormData): string[] {
  return formData.getAll('assigneeIds').map(String).filter(Boolean);
}

export async function createProjectAction(
  _previous: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const actor = await requirePermission('task.manage');

  let id: string;

  try {
    id = await asUser(actor, () =>
      createProject({
        name: text(formData, 'name'),
        description: text(formData, 'description'),
        organisationId: text(formData, 'organisationId') || null,
        dueDate: text(formData, 'dueDate') || null,
        phases: text(formData, 'phases')
          .split(',')
          .map((phase) => phase.trim())
          .filter(Boolean),
      }),
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not create the project.' };
  }

  revalidatePath('/projects');
  redirect(`/projects/${id}`);
}

export async function createTaskAction(
  _previous: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const actor = await requirePermission('task.manage');
  const projectId = text(formData, 'projectId');

  try {
    await asUser(actor, () =>
      createTask({
        projectId,
        title: text(formData, 'title'),
        description: text(formData, 'description'),
        priority: toPriority(text(formData, 'priority')),
        assigneeIds: assigneesFrom(formData),
        startAt: text(formData, 'startAt') || null,
        endAt: text(formData, 'endAt') || null,
        phase: text(formData, 'phase') || null,
        estimateMinutes: text(formData, 'estimateHours')
          ? Math.round(Number(text(formData, 'estimateHours')) * 60)
          : null,
      }),
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not create the task.' };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/tasks');
  revalidatePath('/dashboard');
  return { saved: true };
}

/** Used by drag and drop, which sends the neighbours rather than an index. */
export async function reorderTaskAction(input: {
  id: string;
  projectId: string;
  status: string;
  afterTaskId: string | null;
  beforeTaskId: string | null;
}): Promise<void> {
  const actor = await requirePermission('task.manage');

  await asUser(actor, () =>
    moveTaskToPosition(input.id, input.status, input.afterTaskId, input.beforeTaskId),
  );

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath('/tasks');
  revalidatePath('/dashboard');
}

export async function moveTaskAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('task.manage');
  const id = text(formData, 'id');

  await asUser(actor, () => moveTask(id, text(formData, 'status')));

  revalidatePath(`/projects/${text(formData, 'projectId')}`);
  revalidatePath(`/tasks/${id}`);
  revalidatePath('/tasks');
  revalidatePath('/dashboard');
}

export async function updateTaskAction(
  _previous: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const actor = await requirePermission('task.manage');
  const id = text(formData, 'id');

  try {
    await asUser(actor, () =>
      updateTask(id, {
        title: text(formData, 'title'),
        description: text(formData, 'description'),
        priority: toPriority(text(formData, 'priority')),
        assigneeIds: assigneesFrom(formData),
        startAt: text(formData, 'startAt') || null,
        endAt: text(formData, 'endAt') || null,
        estimateMinutes: text(formData, 'estimateHours')
          ? Math.round(Number(text(formData, 'estimateHours')) * 60)
          : null,
        phase: text(formData, 'phase') || null,
        tags: text(formData, 'tags')
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      }),
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the task.' };
  }

  revalidatePath(`/tasks/${id}`);
  return { saved: true };
}

export async function addSubtaskAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('task.manage');
  const id = text(formData, 'taskId');
  const title = text(formData, 'title');

  if (title) {
    await asUser(actor, () => addSubtask(id, title));
  }

  revalidatePath(`/tasks/${id}`);
}

export async function toggleSubtaskAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('task.manage');
  const id = text(formData, 'taskId');

  await asUser(actor, () =>
    toggleSubtask(id, text(formData, 'subtaskId'), text(formData, 'done') !== 'true'),
  );

  revalidatePath(`/tasks/${id}`);
}

export async function setPhasesAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('task.manage');
  const id = text(formData, 'projectId');

  await asUser(actor, () =>
    updateProjectPhases(
      id,
      text(formData, 'phases')
        .split(',')
        .map((phase) => phase.trim()),
    ),
  );

  revalidatePath(`/projects/${id}`);
}

export async function addDocumentAction(
  _previous: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const actor = await requirePermission('task.manage');
  const id = text(formData, 'taskId');

  try {
    await asUser(actor, () => addDocumentLink(id, text(formData, 'url'), text(formData, 'title')));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not add the link.' };
  }

  revalidatePath(`/tasks/${id}`);
  return { saved: true };
}

export async function removeDocumentAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('task.manage');
  const id = text(formData, 'taskId');

  await asUser(actor, () => removeDocumentLink(id, text(formData, 'linkId')));

  revalidatePath(`/tasks/${id}`);
}

export async function archiveTaskAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('task.manage');

  await asUser(actor, () => archiveTask(text(formData, 'id')));

  revalidatePath('/tasks');
  redirect('/tasks');
}

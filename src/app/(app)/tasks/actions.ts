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
  patchTask,
  removeDocumentLink,
  setSubtaskAssignee,
  toggleSubtask,
  updateTask,
  type Priority,
} from '@/modules/tasks/services/task.service';
import { createSpace, reorderSpaces, updateSpace } from '@/modules/tasks/services/space.service';
import { archiveFolder, createFolder, reorderFolders, updateFolder } from '@/modules/tasks/services/folder.service';

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

export async function createSpaceAction(
  _previous: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const actor = await requirePermission('task.manage');

  let id: string;

  try {
    id = await asUser(actor, () =>
      createSpace({
        name: text(formData, 'name'),
        description: text(formData, 'description'),
        organisationId: text(formData, 'organisationId') || null,
        dueDate: text(formData, 'dueDate') || null,
        memberIds: formData.getAll('memberIds').map(String).filter(Boolean),
      }),
    );

    // Folders typed on the create form are made straight away, so a new space opens with somewhere
    // to put work rather than with an empty page and a second form to find.
    const names = text(formData, 'folders')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);

    for (const name of names) {
      await asUser(actor, () => createFolder({ spaceId: id, name }));
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not create the space.' };
  }

  revalidatePath('/spaces');
  redirect(`/spaces/${id}`);
}

export async function updateSpaceAction(_previous: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const actor = await requirePermission('task.manage');
  const id = text(formData, 'id');
  try {
    await asUser(actor, () => updateSpace(id, { name: text(formData, 'name'), description: text(formData, 'description'), organisationId: text(formData, 'organisationId') || null, dueDate: text(formData, 'dueDate') || null, memberIds: formData.getAll('memberIds').map(String).filter(Boolean) }));
  } catch (error) { return { error: error instanceof Error ? error.message : 'Could not update the space.' }; }
  revalidatePath(`/spaces/${id}`); revalidatePath('/spaces'); return { saved: true };
}

/** Persisting a drag reorder of the Spaces list. */
export async function reorderSpacesAction(orderedIds: string[]): Promise<{ error?: string }> {
  const actor = await requirePermission('task.manage');

  try {
    await asUser(actor, () => reorderSpaces(orderedIds));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the new order.' };
  }

  revalidatePath('/spaces');
  return {};
}

/** Persisting a drag reorder of one space's folders, from the sidebar tree. */
export async function reorderFoldersAction(
  spaceId: string,
  orderedIds: string[],
): Promise<{ error?: string }> {
  const actor = await requirePermission('task.manage');

  try {
    await asUser(actor, () => reorderFolders(spaceId, orderedIds));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the new order.' };
  }

  revalidatePath(`/spaces/${spaceId}`);
  return {};
}

export async function createTaskAction(
  _previous: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const actor = await requirePermission('task.manage');
  const spaceId = text(formData, 'spaceId');

  try {
    await asUser(actor, () =>
      createTask({
        spaceId,
        title: text(formData, 'title'),
        description: text(formData, 'description'),
        priority: toPriority(text(formData, 'priority')),
        assigneeIds: assigneesFrom(formData),
        startAt: text(formData, 'startAt') || null,
        endAt: text(formData, 'endAt') || null,
        folderId: text(formData, 'folderId') || null,
        estimateMinutes: text(formData, 'estimateHours')
          ? Math.round(Number(text(formData, 'estimateHours')) * 60)
          : null,
      }),
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not create the task.' };
  }

  revalidatePath(`/spaces/${spaceId}`);
  revalidatePath('/tasks');
  revalidatePath('/dashboard');
  return { saved: true };
}

/**
 * Adding a task from the foot of a column or a group.
 *
 * A title and nothing else, straight into the column it was typed under. Capture and detail are
 * different moments: making someone fill a form to write down a thought is how thoughts stop
 * getting written down, and everything else about the task can be set from the row afterwards.
 */
export async function quickAddTaskAction(input: {
  spaceId: string;
  title: string;
  status: string;
  folderId?: string | null;
}): Promise<TaskFormState> {
  const actor = await requirePermission('task.manage');

  const title = input.title.trim();
  if (!title) return { error: 'A task needs a title.' };

  try {
    await asUser(actor, () =>
      createTask({
        spaceId: input.spaceId,
        title,
        status: input.status,
        folderId: input.folderId ?? null,
      }),
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not add the task.' };
  }

  revalidatePath(`/spaces/${input.spaceId}`);
  revalidatePath('/tasks');
  revalidatePath('/dashboard');
  return { saved: true };
}

/** Used by drag and drop, which sends the neighbours rather than an index. */
export async function reorderTaskAction(input: {
  id: string;
  spaceId: string;
  status: string;
  afterTaskId: string | null;
  beforeTaskId: string | null;
}): Promise<void> {
  const actor = await requirePermission('task.manage');

  await asUser(actor, () =>
    moveTaskToPosition(input.id, input.status, input.afterTaskId, input.beforeTaskId),
  );

  revalidatePath(`/spaces/${input.spaceId}`);
  revalidatePath('/tasks');
  revalidatePath('/dashboard');
}

export async function moveTaskAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('task.manage');
  const id = text(formData, 'id');

  await asUser(actor, () => moveTask(id, text(formData, 'status')));

  revalidatePath(`/spaces/${text(formData, 'spaceId')}`);
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
        folderId: text(formData, 'folderId') || null,
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

/**
 * Inline edits from a card or a row.
 *
 * These come from a click on the board, not from a form, so they take arguments rather than
 * FormData and send only the field that changed.
 */
export async function patchTaskAction(input: {
  id: string;
  spaceId: string;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  startAt?: string | null;
  endAt?: string | null;
  assigneeIds?: string[];
  title?: string;
  description?: string | null;
  tags?: string[];
}): Promise<TaskFormState> {
  const actor = await requirePermission('task.manage');

  try {
    await asUser(actor, () =>
      patchTask(input.id, {
        priority: input.priority,
        startAt: input.startAt,
        endAt: input.endAt,
        assigneeIds: input.assigneeIds,
        title: input.title,
        description: input.description,
        tags: input.tags,
      }),
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the change.' };
  }

  revalidatePath(`/spaces/${input.spaceId}`);
  revalidatePath(`/tasks/${input.id}`);
  revalidatePath('/tasks');
  revalidatePath('/dashboard');
  return { saved: true };
}

/** Adding a subtask from the panel, which has to refresh the space page too. */
export async function addSubtaskInlineAction(input: {
  taskId: string;
  title: string;
  spaceId: string;
}): Promise<TaskFormState> {
  const actor = await requirePermission('task.manage');

  const title = input.title.trim();
  if (!title) return { error: 'A subtask needs a title.' };

  try {
    await asUser(actor, () => addSubtask(input.taskId, title));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not add the subtask.' };
  }

  revalidatePath(`/spaces/${input.spaceId}`);
  revalidatePath(`/tasks/${input.taskId}`);
  return { saved: true };
}

/** The subtask checkbox inside the space list, which has to refresh the space page too. */
export async function setSubtaskDoneAction(input: {
  taskId: string;
  subtaskId: string;
  done: boolean;
  spaceId: string;
}): Promise<void> {
  const actor = await requirePermission('task.manage');

  await asUser(actor, () => toggleSubtask(input.taskId, input.subtaskId, input.done));

  revalidatePath(`/spaces/${input.spaceId}`);
  revalidatePath(`/tasks/${input.taskId}`);
}

/** Give a subtask to a member (or clear it) from the board panel or the task page. */
export async function setSubtaskAssigneeAction(input: {
  taskId: string;
  subtaskId: string;
  assigneeId: string | null;
  spaceId?: string;
}): Promise<{ error?: string }> {
  const actor = await requirePermission('task.manage');

  try {
    await asUser(actor, () =>
      setSubtaskAssignee(input.taskId, input.subtaskId, input.assigneeId),
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not assign the subtask.' };
  }

  if (input.spaceId) revalidatePath(`/spaces/${input.spaceId}`);
  revalidatePath(`/tasks/${input.taskId}`);
  return {};
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

/* Folders: the second level, and the only place visibility is decided. */

export async function saveFolderAction(
  _previous: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const actor = await requirePermission('task.manage');

  const id = text(formData, 'id');
  const spaceId = text(formData, 'spaceId');

  const input = {
    spaceId,
    name: text(formData, 'name'),
    description: text(formData, 'description') || null,
    memberIds: formData.getAll('memberIds').map(String).filter(Boolean),
  };

  try {
    await asUser(actor, async () => {
      if (id) await updateFolder(id, input);
      else await createFolder(input);
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the folder.' };
  }

  revalidatePath(`/spaces/${spaceId}`);
  revalidatePath('/spaces');
  return { saved: true };
}

/** Creating a folder from the tree, where there is room for a name and nothing else. */
export async function quickAddFolderAction(input: {
  spaceId: string;
  name: string;
  privateToMe?: boolean;
}): Promise<TaskFormState> {
  const actor = await requirePermission('task.manage');

  const name = input.name.trim();
  if (!name) return { error: 'A folder needs a name.' };

  try {
    await asUser(actor, () => createFolder({ spaceId: input.spaceId, name, memberIds: input.privateToMe ? [actor.id] : [] }));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not add the folder.' };
  }

  revalidatePath(`/spaces/${input.spaceId}`);
  revalidatePath('/spaces');
  return { saved: true };
}

/** Creating a space from the tree, same idea. */
export async function quickAddSpaceAction(input: { name: string }): Promise<TaskFormState> {
  const actor = await requirePermission('task.manage');

  const name = input.name.trim();
  if (!name) return { error: 'A space needs a name.' };

  try {
    await asUser(actor, () => createSpace({ name }));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not add the space.' };
  }

  revalidatePath('/spaces');
  return { saved: true };
}

/**
 * Archiving a folder.
 *
 * The work inside comes out into the space rather than disappearing with the folder, because a
 * folder is a way of grouping and removing it should not remove what was grouped.
 */
export async function archiveFolderAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('task.manage');

  const id = text(formData, 'id');
  const spaceId = text(formData, 'spaceId');

  await asUser(actor, () => archiveFolder(id));

  revalidatePath(`/spaces/${spaceId}`);
  revalidatePath('/spaces');
}

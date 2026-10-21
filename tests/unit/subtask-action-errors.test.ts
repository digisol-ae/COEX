import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn(async () => ({ id: 'qa' })),
  asUser: vi.fn(async (_actor, action) => action()),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import * as tasks from '@/modules/tasks/services/task.service';
import {
  setSubtaskDoneAction,
  setSubtaskAssigneeAction,
  toggleSubtaskAction,
} from '@/app/(app)/tasks/actions';

afterEach(() => vi.restoreAllMocks());

describe('subtask action error messages', () => {
  it('returns a useful message instead of leaking a TypeError on board and full-page updates', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(tasks, 'toggleSubtask').mockRejectedValue(
      new TypeError("Cannot read properties of undefined (reading 'filter')"),
    );
    const expected = { error: 'Could not update this subtask. Please try again.' };
    expect(
      await setSubtaskDoneAction({
        taskId: 'task',
        subtaskId: 'step',
        done: true,
        spaceId: 'space',
      }),
    ).toEqual(expected);
    const form = new FormData();
    form.set('taskId', 'task');
    form.set('subtaskId', 'step');
    form.set('done', 'false');
    expect(await toggleSubtaskAction(form)).toEqual(expected);
  });
  it('preserves actionable assignment validation while hiding unexpected failures', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const assign = vi
      .spyOn(tasks, 'setSubtaskAssignee')
      .mockRejectedValueOnce(
        new Error('That person is not a member of this private Space or Folder.'),
      )
      .mockRejectedValueOnce(new TypeError('internal detail'));
    const input = { taskId: 'task', subtaskId: 'step', assigneeId: 'person' };
    expect((await setSubtaskAssigneeAction(input)).error).toBe(
      'That person is not a member of this private Space or Folder.',
    );
    expect((await setSubtaskAssigneeAction(input)).error).toBe(
      'Could not assign this subtask. Please try again.',
    );
    expect(assign).toHaveBeenCalledTimes(2);
  });
});

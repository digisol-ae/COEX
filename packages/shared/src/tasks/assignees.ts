/** People doing the work include delegated subtasks without changing the parent owners. */
export function taskAssigneeIds(task: {
  assigneeIds: readonly unknown[];
  subtasks?: readonly { assigneeId?: unknown }[];
}): string[] {
  return [
    ...new Set([
      ...task.assigneeIds.map(String),
      ...(task.subtasks ?? []).flatMap((subtask) =>
        subtask.assigneeId ? [String(subtask.assigneeId)] : [],
      ),
    ]),
  ];
}

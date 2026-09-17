import { asUser, getSignedInUser } from '@/lib/session';
import { listTasks } from '@/modules/tasks/services/task.service';
import { getTask } from '@/modules/tasks/services/task.service';

/** Tasks and their subtasks for one project, loaded when that project is expanded. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSignedInUser();

  if (!user) {
    return Response.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const { id } = await params;

  const tasks = await asUser(user, async () => {
    const summaries = await listTasks({ projectId: id, includeClosed: true });

    // Subtasks are embedded on the task, so one read per task rather than a second collection.
    return Promise.all(
      summaries.map(async (summary) => {
        const task = summary.subtaskCount > 0 ? await getTask(summary.id) : null;

        return {
          id: summary.id,
          number: summary.number,
          title: summary.title,
          isClosed: summary.isClosed,
          subtasks: (task?.subtasks ?? []).map((subtask) => ({
            id: String(subtask._id),
            title: subtask.title,
            done: subtask.done ?? false,
          })),
        };
      }),
    );
  });

  return Response.json({ tasks });
}

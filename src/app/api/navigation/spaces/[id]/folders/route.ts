import { asUser, getSignedInUser } from '@/lib/session';
import { listFolders } from '@/modules/tasks/services/folder.service';
import { listTasks } from '@/modules/tasks/services/task.service';

/**
 * One space's folders, with the tasks and subtasks inside them, loaded when it is expanded.
 *
 * Folders the person may not open never reach this response, because listFolders and listTasks both
 * apply the visibility rule. Work that sits directly in the space, in no folder at all, comes back
 * under a group with a null id rather than being dropped.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSignedInUser();

  if (!user) {
    return Response.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const { id } = await params;

  const groups = await asUser(user, async () => {
    const [folders, tasks] = await Promise.all([
      listFolders(id),
      listTasks({ spaceId: id, includeClosed: true }),
    ]);

    const asNode = (task: (typeof tasks)[number]) => ({
      id: task.id,
      number: task.number,
      title: task.title,
      isClosed: task.isClosed,
      subtasks: task.subtasks,
    });

    const inFolders = folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      isPrivate: folder.isPrivate,
      tasks: tasks.filter((task) => task.folderId === folder.id).map(asNode),
    }));

    const loose = tasks.filter((task) => !task.folderId).map(asNode);

    return loose.length > 0
      ? [...inFolders, { id: null, name: 'No folder', isPrivate: false, tasks: loose }]
      : inFolders;
  });

  return Response.json({ folders: groups });
}

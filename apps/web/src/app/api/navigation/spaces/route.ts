import { asUser, getSignedInUser } from '@/lib/session';
import { listSpaces } from '@/modules/tasks/services/space.service';

/**
 * Spaces for the sidebar tree.
 *
 * Fetched when the tree is first opened rather than with every page, because a tenant with fifty
 * spaces should not pay for that list on a screen that never shows it.
 */
export async function GET() {
  const user = await getSignedInUser();

  if (!user) {
    return Response.json({ error: 'Sign in first.' }, { status: 401 });
  }

  if (!user.permissions.includes('task.read.all')) {
    return Response.json({ spaces: [] });
  }

  const spaces = await asUser(user, listSpaces);

  return Response.json({
    spaces: spaces
      .filter((space) => space.status === 'active')
      .map((space) => ({
        id: space.id,
        name: space.name,
        openTaskCount: space.openTaskCount,
      })),
  });
}

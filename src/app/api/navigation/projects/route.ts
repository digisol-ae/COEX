import { asUser, getSignedInUser } from '@/lib/session';
import { listProjects } from '@/modules/tasks/services/project.service';

/**
 * Projects for the sidebar tree.
 *
 * Fetched when the tree is first opened rather than with every page, because a tenant with fifty
 * projects should not pay for that list on a screen that never shows it.
 */
export async function GET() {
  const user = await getSignedInUser();

  if (!user) {
    return Response.json({ error: 'Sign in first.' }, { status: 401 });
  }

  if (!user.permissions.includes('task.read.all')) {
    return Response.json({ projects: [] });
  }

  const projects = await asUser(user, listProjects);

  return Response.json({
    projects: projects
      .filter((project) => project.status === 'active')
      .map((project) => ({
        id: project.id,
        name: project.name,
        openTaskCount: project.openTaskCount,
      })),
  });
}

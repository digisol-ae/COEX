import { getSignedInUser } from '@/lib/session';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' };
/** Only a destination is returned. No user, permission, tenant or session data leaves the app. */
export async function GET() {
  try {
    const user = await getSignedInUser();
    const destination = !user
      ? null
      : user.workspaceAccess && user.workspaceAccess !== 'allowed'
        ? '/workspace-status'
        : user.role === 'client_contact'
          ? '/portal'
          : '/dashboard';
    return Response.json({ destination }, { headers });
  } catch {
    return Response.json({ error: 'Session unavailable' }, { status: 503, headers });
  }
}

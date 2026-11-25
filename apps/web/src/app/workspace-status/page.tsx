import { redirect } from 'next/navigation';
import { getSignedInUser } from '@/lib/session';
import { logoutAction } from '../login/actions';
import { AuthShell } from '../login/auth-shell';
import { Button, Notice } from '@/components/ui';

export default async function WorkspaceStatusPage() {
  const user = await getSignedInUser();
  if (!user) redirect('/login');
  if (!user.workspaceAccess || user.workspaceAccess === 'allowed')
    redirect(user.role === 'client_contact' ? '/portal' : '/dashboard');
  return (
    <AuthShell title="Workspace access paused" intro={user.tenantName}>
      <div className="mt-6 space-y-4">
        <Notice tone="warn">
          {user.workspaceAccess === 'trial_expired'
            ? 'Your trial or its extension has ended.'
            : 'Your workspace is suspended or its subscription has ended.'}{' '}
          Contact the platform owner to extend or renew access. Your records have not been deleted.
        </Notice>
        <form action={logoutAction}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}

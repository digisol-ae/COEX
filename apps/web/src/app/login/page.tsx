import { redirect } from 'next/navigation';
import { getSignedInUser } from '@/lib/session';
import { LoginEntry } from './login-entry';
import { isEntraConfigured } from '@/modules/core/services/entra.service';
import { portalAuthTenant } from '@/lib/portal-session';
import { portalPath, portalAuthPath } from '@coex/shared/core/portal-links';
import { AuthShell } from './auth-shell';
import { LoginForm } from './login-form';
import { logoutAction } from './actions';
import Link from 'next/link';
import { Button, Notice } from '@/components/ui';

export const metadata = { title: 'Sign in to Worktello' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ entra?: string; view?: string; tenant?: string }>;
}) {
  const user = await getSignedInUser();
  const params = await searchParams;
  const tenant = await portalAuthTenant(params.tenant);
  if (user && (!tenant || (user.role === 'client_contact' && user.tenantId === tenant.id)))
    redirect(
      user.workspaceAccess && user.workspaceAccess !== 'allowed'
        ? '/workspace-status'
        : user.role === 'client_contact'
          ? portalPath(user.tenantSlug)
          : '/dashboard',
    );
  if (tenant)
    return (
      <AuthShell
        title={`${tenant.name} · Customer portal`}
        intro="Sign in to submit requests and follow your own support tickets with this company."
      >
        {user ? (
          <div className="mt-7 space-y-4">
            <Notice>
              You are signed in to {user.tenantName}. Sign out before entering this company’s
              customer portal.
            </Notice>
            <form action={logoutAction}>
              <input type="hidden" name="tenant" value={tenant.slug} />
              <Button type="submit">Sign out and continue</Button>
            </form>
          </div>
        ) : (
          <>
            <LoginForm key={tenant.slug} customer tenantSlug={tenant.slug} />
            <p className="mt-4 text-center text-sm">
              <Link href={portalAuthPath('/activate', tenant.slug)} className="underline">
                First time here? Activate your account
              </Link>
            </p>
          </>
        )}
      </AuthShell>
    );

  return (
    <LoginEntry
      entraEnabled={isEntraConfigured()}
      entraError={params.entra}
      staff={params.view === 'staff'}
    />
  );
}

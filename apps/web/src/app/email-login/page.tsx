import { portalAuthTenant } from '@/lib/portal-session';
import { AuthShell } from '../login/auth-shell';
import { EmailLoginForm } from './form';
import { CustomerWelcome } from '../login/customer-welcome';
export const metadata = { title: 'Email code sign-in · Worktello' };
export default async function EmailLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>;
}) {
  const tenant = await portalAuthTenant((await searchParams).tenant);
  return (
    <AuthShell
      title={tenant ? `${tenant.name} · Sign in with an email code` : 'Sign in with an email code'}
      intro="Access your support tickets using a one-time code sent to your registered email. No password needed."
    >
      {!tenant && <CustomerWelcome />}
      <EmailLoginForm key={tenant?.slug ?? 'legacy'} tenantSlug={tenant?.slug} />
    </AuthShell>
  );
}

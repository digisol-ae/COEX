import { portalAuthTenant } from '@/lib/portal-session';
import { AuthShell } from '../login/auth-shell';
import { ForgotForm } from './forgot-form';

export const metadata = { title: 'Forgot password · Worktello' };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string; view?: string }>;
}) {
  const params = await searchParams;
  const tenant = await portalAuthTenant(params.tenant);
  return (
    <AuthShell
      title={tenant ? `${tenant.name} · Forgot your password?` : 'Forgot your password?'}
      intro="Enter the email you sign in with. If it has a Worktello account, we send a link to choose a new password."
    >
      <ForgotForm
        staff={!tenant && params.view === 'staff'}
        key={tenant?.slug ?? 'legacy'}
        tenantSlug={tenant?.slug}
      />
    </AuthShell>
  );
}

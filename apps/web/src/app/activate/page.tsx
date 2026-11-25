import { portalAuthTenant } from '@/lib/portal-session';
import { AuthShell } from '../login/auth-shell';
import { ActivationForm } from './form';
export const metadata = { title: 'Activate your account · Worktello' };
export default async function ActivationPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>;
}) {
  const tenant = await portalAuthTenant((await searchParams).tenant);
  return (
    <AuthShell
      title={tenant ? `${tenant.name} · First time on Worktello?` : 'First time on Worktello?'}
      intro="Verify your email address, then choose a password to access your support tickets."
    >
      <ActivationForm key={tenant?.slug ?? 'legacy'} tenantSlug={tenant?.slug} />
    </AuthShell>
  );
}

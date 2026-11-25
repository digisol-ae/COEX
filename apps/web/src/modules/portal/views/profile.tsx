import { portalAuthPath } from '@coex/shared/core/portal-links';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { asUser, type SignedInUser } from '@/lib/session';
import { portalIdentity } from '@/modules/portal/service';
import { PageHeader, Notice } from '@/components/ui';
import { PortalProfileForm } from '@/app/portal/profile/form';
export const metadata = { title: 'My profile · Worktello' };
export default async function Page({ user }: { user: SignedInUser }) {
  if (user.role !== 'client_contact') redirect('/dashboard');
  let identity;
  try {
    identity = await asUser(user, portalIdentity);
  } catch {
    return <Notice tone="warn">Portal access is unavailable. Please contact support.</Notice>;
  }
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageHeader title="My profile" descriptionInline description={user.email} />
      <PortalProfileForm
        tenantId={user.tenantId}
        name={identity.user.name}
        title={identity.user.title ?? ''}
      />
      <Link
        href={portalAuthPath('/forgot-password', user.tenantSlug)}
        className="inline-block text-sm underline"
      >
        Reset password
      </Link>
    </div>
  );
}

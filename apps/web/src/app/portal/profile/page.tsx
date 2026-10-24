import Link from 'next/link';
import { redirect } from 'next/navigation';
import { asUser, requireUser } from '@/lib/session';
import { portalIdentity } from '@/modules/portal/service';
import { PageHeader, Notice } from '@/components/ui';
import { PortalProfileForm } from './form';
export const metadata = { title: 'My profile · Worktello' };
export default async function Page() {
  const user = await requireUser();
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
      <PortalProfileForm name={identity.user.name} title={identity.user.title ?? ''} />
      <Link href="/forgot-password" className="inline-block text-sm underline">
        Reset password
      </Link>
    </div>
  );
}

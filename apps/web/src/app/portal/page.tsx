import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSignedInUser } from '@/lib/session';
import { portalPath } from '@coex/shared/core/portal-links';
import { PageHeader } from '@/components/ui';
export const metadata = { title: 'Customer portal · Worktello' };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}) {
  const user = await getSignedInUser();
  if (user?.role === 'client_contact' && user.tenantSlug) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams))
      if (typeof value === 'string') query.set(key, value);
    redirect(portalPath(user.tenantSlug) + (query.size ? `?${query}` : ''));
  }
  return (
    <>
      <PageHeader
        title="Customer support"
        description="Use your company’s portal link to sign in, submit requests and follow your own tickets."
      />
      <Link href={user ? '/dashboard' : '/login'} className="underline">
        {user ? 'Back to Worktello' : 'Customer sign-in'}
      </Link>
    </>
  );
}

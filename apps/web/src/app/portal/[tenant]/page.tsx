import { requireTenantPortalUser } from '@/lib/portal-session';
import PortalView from '@/modules/portal/views/index';
export const metadata = { title: 'Customer portal · Worktello' };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}) {
  const user = await requireTenantPortalUser((await params).tenant);
  return <PortalView user={user} searchParams={searchParams} />;
}

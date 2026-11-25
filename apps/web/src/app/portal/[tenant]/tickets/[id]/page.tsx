import { requireTenantPortalUser } from '@/lib/portal-session';
import TicketView from '@/modules/portal/views/ticket';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string; id: string }>;
  searchParams: Promise<{ attachment?: string }>;
}) {
  const selected = await params;
  const user = await requireTenantPortalUser(selected.tenant);
  return (
    <TicketView
      user={user}
      params={Promise.resolve({ id: selected.id })}
      searchParams={searchParams}
    />
  );
}

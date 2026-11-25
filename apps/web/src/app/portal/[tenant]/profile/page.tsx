import { requireTenantPortalUser } from '@/lib/portal-session';
import View from '@/modules/portal/views/profile';
export default async function Page({ params }: { params: Promise<{ tenant: string }> }) {
  const user = await requireTenantPortalUser((await params).tenant);
  return <View user={user} />;
}

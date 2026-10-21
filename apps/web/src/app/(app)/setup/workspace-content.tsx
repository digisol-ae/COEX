import { notFound } from 'next/navigation';
import { requireStaffUser } from '@/lib/session';
import { GROUPS } from '@/components/navigation/navigation';
import { SetupWorkspace } from '@/components/navigation/setup-workspace';
import Queues from './queues/page';
import Tutorials from './tutorials/page';
import Email from './email/page';
import Pipeline from './pipeline/page';
import WhatsApp from './whatsapp/page';
import Replies from './canned-replies/page';
import Tenant from './tenant/page';
import Fields from './fields/page';
import Tenants from './tenants/page';
const PAGES = {
  queues: Queues,
  tutorials: Tutorials,
  email: Email,
  pipeline: Pipeline,
  whatsapp: WhatsApp,
  'canned-replies': Replies,
  tenant: Tenant,
  fields: Fields,
  tenants: Tenants,
};
export async function setupTabs() {
  const user = await requireStaffUser();
  return GROUPS.find((group) => group.id === 'setup')!.items.filter(
    (tab) => !tab.permission || user.permissions.includes(tab.permission),
  );
}
export async function SetupContent({ section }: { section?: string }) {
  const tabs = await setupTabs();
  const selected = section ?? tabs[0]?.href.split('/').pop();
  if (!selected || !tabs.some((tab) => tab.href === `/setup/${selected}`) || !(selected in PAGES))
    notFound();
  const Page = PAGES[selected as keyof typeof PAGES];
  return <Page />;
}
export async function SetupPopup({ section }: { section?: string }) {
  return (
    <SetupWorkspace tabs={await setupTabs()}>
      <SetupContent section={section} />
    </SetupWorkspace>
  );
}

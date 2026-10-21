import Link from 'next/link';
import { redirect } from 'next/navigation';
import { asUser, requireUser } from '@/lib/session';
import { portalIdentity } from '@/modules/portal/service';
import { PageHeader, Notice } from '@/components/ui';
import { PortalTicketForm } from '../ticket-form';
export default async function NewPortalTicket() {
  const user = await requireUser();
  if (user.role !== 'client_contact') redirect('/portal');
  try {
    await asUser(user, portalIdentity);
  } catch (error) {
    return (
      <Notice tone="warn">{error instanceof Error ? error.message : 'Portal unavailable.'}</Notice>
    );
  }
  return (
    <>
      <Link href="/portal" className="text-sm underline">
        My tickets
      </Link>
      <PageHeader
        title="Raise ticket"
        description="Tell us what happened. You can attach screenshots or paste an image."
      />
      <PortalTicketForm />
    </>
  );
}

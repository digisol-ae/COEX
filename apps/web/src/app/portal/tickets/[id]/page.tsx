import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { portalPath } from '@coex/shared/core/portal-links';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attachment?: string }>;
}) {
  const user = await requireUser();
  if (user.role !== 'client_contact') redirect('/dashboard');
  if (!user.tenantSlug) redirect('/login');
  const id = (await params).id;
  const attachment = (await searchParams).attachment;
  redirect(
    `${portalPath(user.tenantSlug)}/tickets/${encodeURIComponent(id)}${attachment ? `?attachment=${encodeURIComponent(attachment)}` : ''}`,
  );
}

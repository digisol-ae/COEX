import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asUser, requirePermission } from '@/lib/session';
import { getContract } from '@/modules/crm/services/contract.service';
import { signatureWorkspace } from '@/modules/crm/services/agreement-signature.service';
import { PageHeader } from '@/components/ui';
import { SignaturePanel } from './signature-panel';

export const metadata = { title: 'Contract signatures · Worktello' };
export default async function SignaturePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const actor = await requirePermission('contract.read');
  const contract = await asUser(actor, () => getContract(id));
  if (!contract) notFound();
  const { page } = await searchParams;
  const workspace = await asUser(actor, () => signatureWorkspace(id, Number(page ?? 1)));
  return (
    <main className="mx-auto max-w-4xl space-y-5">
      <Link className="text-sm underline" href={`/contracts/${id}`}>
        Back to {contract.number}
      </Link>
      <PageHeader
        title="Contract signatures"
        description={`${contract.organisationName} · ${contract.title}`}
      />
      <SignaturePanel
        contractId={id}
        workspace={workspace}
        editable={actor.permissions.includes('contract.manage')}
      />
    </main>
  );
}

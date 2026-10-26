import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asUser, requirePermission } from '@/lib/session';
import { getContract } from '@/modules/crm/services/contract.service';
import {
  listAgreementTemplates,
  getAgreementDraft,
  agreementValues,
} from '@/modules/crm/services/agreement.service';
import { PageHeader } from '@/components/ui';
import { AgreementEditor } from './agreement-editor';
export const metadata = { title: 'Draft agreement · Worktello' };
export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePermission('contract.read');
  const contract = await asUser(actor, () => getContract(id));
  if (!contract) notFound();
  const [templates, draft, values] = await asUser(actor, () =>
    Promise.all([listAgreementTemplates(), getAgreementDraft(id), agreementValues(id)]),
  );
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Link className="text-sm underline" href={`/contracts/${id}`}>
        Back to {contract.number}
      </Link>
      <PageHeader
        title="Draft customer agreement"
        description={`${contract.organisationName} · ${contract.title}`}
      />
      <AgreementEditor
        key={draft?.revision ?? 0}
        contractId={id}
        number={contract.number}
        templates={templates.filter((t) => t.type === contract.type)}
        draft={draft}
        automaticValues={values}
        editable={actor.permissions.includes('contract.manage')}
      />
    </div>
  );
}

import Link from 'next/link';
import { asUser, requirePermission } from '@/lib/session';
import { listAgreementTemplates } from '@/modules/crm/services/agreement.service';
import { PageHeader } from '@/components/ui';
import { TemplateLibrary } from './template-library';
export const metadata = { title: 'Contract templates · Worktello' };
export default async function TemplatesPage() {
  const actor = await requirePermission('contract.read');
  const templates = await asUser(actor, listAgreementTemplates);
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Link className="text-sm underline" href="/contracts">
        Back to contracts
      </Link>
      <PageHeader
        title="Contract templates"
        description="Reusable full agreements. Add as many templates as your business needs, then apply one to a customer contract."
      />
      <TemplateLibrary
        templates={templates}
        editable={actor.permissions.includes('contract.manage')}
      />
    </div>
  );
}

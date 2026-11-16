import { asUser, requirePermission } from '@/lib/session';
import { draftAgreementDownload } from '@/modules/crm/signed-agreement-pdf';
import { getAgreementDraft } from '@/modules/crm/services/agreement.service';
import { getContract } from '@/modules/crm/services/contract.service';
import { getTenantLetterhead } from '@/modules/crm/services/tenant-letterhead.service';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission('contract.read');
  const { id } = await params;
  return asUser(actor, async () => {
    const contract = await getContract(id);
    const draft = contract && (await getAgreementDraft(id));
    if (!contract || !draft)
      return new Response('Draft agreement unavailable.', {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      });

    return draftAgreementDownload({
      body: draft.body,
      contractNumber: contract.number,
      customerName: contract.organisationName,
      letterhead: await getTenantLetterhead(),
      coverDetails: contract,
    });
  });
}

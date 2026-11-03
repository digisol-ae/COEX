import { asUser, requirePermission } from '@/lib/session';
import { staffSignedAgreement } from '@/modules/crm/services/agreement-signature.service';
import { signingReceiptResponse } from '@/modules/crm/signed-agreement';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; requestId: string }> },
) {
  const actor = await requirePermission('contract.read');
  const { id, requestId } = await params;
  const agreement = await asUser(actor, () => staffSignedAgreement(id, requestId));
  if (!agreement)
    return new Response('Signing receipt unavailable.', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  return signingReceiptResponse(agreement);
}

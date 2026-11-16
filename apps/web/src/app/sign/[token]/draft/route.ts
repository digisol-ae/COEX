import { cookies } from 'next/headers';
import {
  hasSigningAccess,
  legacyAgreementCover,
  publicSignatureRequest,
  signingCookieName,
} from '@/modules/crm/services/agreement-signature.service';
import { draftAgreementDownload } from '@/modules/crm/signed-agreement-pdf';

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const agreement = await publicSignatureRequest(token);
  if (
    !agreement ||
    agreement.status !== 'pending' ||
    !hasSigningAccess(agreement, (await cookies()).get(signingCookieName(agreement._id))?.value)
  )
    return new Response('Draft agreement unavailable.', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });

  return draftAgreementDownload({
    body: agreement.body,
    contractNumber: agreement.contractNumber,
    customerName: agreement.customerName,
    letterhead: agreement.letterhead,
    coverDetails: agreement.coverDetails ?? (await legacyAgreementCover(agreement)),
  });
}

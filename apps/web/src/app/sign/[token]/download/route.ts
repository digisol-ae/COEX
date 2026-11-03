import { cookies } from 'next/headers';
import {
  publicSignatureRequest,
  signingCookieName,
  hasSigningAccess,
} from '@/modules/crm/services/agreement-signature.service';
import { signedAgreementResponse } from '@/modules/crm/signed-agreement';
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const agreement = await publicSignatureRequest(token);
  if (
    !agreement ||
    agreement.status !== 'signed' ||
    !hasSigningAccess(agreement, (await cookies()).get(signingCookieName(agreement._id))?.value)
  )
    return new Response('Signed agreement unavailable.', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  return signedAgreementResponse(agreement);
}

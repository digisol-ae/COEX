'use server';
import { cookies, headers } from 'next/headers';
import {
  signAgreement,
  publicSignatureRequest,
  requestSigningCode,
  verifySigningCode,
  signingCookieName,
} from '@/modules/crm/services/agreement-signature.service';
import type { SignatureCapture } from '@coex/shared/crm/signature-capture';

export async function signAgreementAction(
  token: string,
  name: string,
  consent: boolean,
  capture: SignatureCapture,
) {
  try {
    const request = await publicSignatureRequest(token);
    if (!request) throw new Error('This signing link is unavailable or expired.');
    await signAgreement(token, {
      name,
      consent,
      userAgent: (await headers()).get('user-agent') ?? '',
      accessToken: (await cookies()).get(signingCookieName(request._id))?.value,
      capture,
    });
    return { signed: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Could not sign the agreement. Please try again.',
    };
  }
}

export async function requestSigningCodeAction(token: string) {
  try {
    await requestSigningCode(token);
    return { queued: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Could not request a verification code.',
    };
  }
}
export async function verifySigningCodeAction(token: string, code: string) {
  try {
    const result = await verifySigningCode(token, code);
    (await cookies()).set(signingCookieName(result.requestId), result.accessToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: `/sign/${token}`,
      maxAge: 30 * 60,
    });
    return { verified: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not verify the code.' };
  }
}

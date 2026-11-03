import { NextResponse } from 'next/server';
import { hasTrustedRequestOrigin } from '@/lib/request-origin';
import { resendResourceOtp, verifyResourceOtp } from '@/modules/resources/service';
import { boundedBody, PRIVATE_HEADERS, resourceCookie } from '@/modules/resources/http';
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!hasTrustedRequestOrigin(request))
    return NextResponse.json(
      { error: 'Refresh the resource link and try again.' },
      { status: 403, headers: PRIVATE_HEADERS },
    );
  try {
    const { token } = await params;
    const data = JSON.parse((await boundedBody(request, 2048)).toString('utf8'));
    if (data.action === 'resend') {
      await resendResourceOtp(token);
      return NextResponse.json({ sent: true }, { headers: PRIVATE_HEADERS });
    }
    if (data.action !== 'verify' || typeof data.code !== 'string')
      throw new Error('Enter the one-time code from your email.');
    const access = await verifyResourceOtp(token, data.code.trim());
    const response = NextResponse.json({ verified: true }, { headers: PRIVATE_HEADERS });
    response.cookies.set(resourceCookie(access.shareId), access.browserToken, {
      httpOnly: true,
      secure: new URL(request.url).protocol === 'https:' || process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: `/shared/resources/${token}`,
      expires: access.expiresAt,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error &&
          /^(Code is invalid|Please wait at least|This resource link|The code could not|Enter the one-time)/.test(
            error.message,
          )
            ? error.message
            : 'Could not verify access. Please try again or contact the sender.',
      },
      { status: 400, headers: PRIVATE_HEADERS },
    );
  }
}

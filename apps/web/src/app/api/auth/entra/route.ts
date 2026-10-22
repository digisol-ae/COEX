import { NextResponse } from 'next/server';
import {
  ENTRA_STATE_COOKIE,
  entraReturnUrl,
  entraStateCookieOptions,
  startEntraSignIn,
} from '@/modules/core/services/entra.service';

export async function GET() {
  try {
    const { authorizationUrl, stateCookie } = startEntraSignIn();
    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(ENTRA_STATE_COOKIE, stateCookie, entraStateCookieOptions);
    return response;
  } catch {
    return NextResponse.redirect(entraReturnUrl('/login?entra=not-configured'));
  }
}

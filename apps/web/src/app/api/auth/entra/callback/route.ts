import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/modules/core/services/session.service';
import { signInWithEntra } from '@/modules/core/services/auth.service';
import {
  completeEntraSignIn,
  ENTRA_STATE_COOKIE,
  entraStateCookieOptions,
} from '@/modules/core/services/entra.service';

function loginUrl(request: NextRequest, reason: string) {
  return new URL(`/login?entra=${reason}`, request.url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  if (!code || !state || request.nextUrl.searchParams.has('error'))
    return NextResponse.redirect(loginUrl(request, 'cancelled'));
  try {
    const identity = await completeEntraSignIn({
      code,
      state,
      stateCookie: request.cookies.get(ENTRA_STATE_COOKIE)?.value,
    });
    const result = await signInWithEntra({
      ...identity,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      userAgent: request.headers.get('user-agent'),
    });
    if (!result.ok || !result.token) return NextResponse.redirect(loginUrl(request, 'account'));
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.set(SESSION_COOKIE, result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: result.expiresAt,
    });
    response.cookies.set(ENTRA_STATE_COOKIE, '', { ...entraStateCookieOptions, maxAge: 0 });
    return response;
  } catch {
    const response = NextResponse.redirect(loginUrl(request, 'failed'));
    response.cookies.set(ENTRA_STATE_COOKIE, '', { ...entraStateCookieOptions, maxAge: 0 });
    return response;
  }
}

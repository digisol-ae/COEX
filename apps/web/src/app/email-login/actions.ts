'use server';
import { resolveAuthenticatedUser } from '@/modules/core/services/auth-context.service';
import { portalPath } from '@coex/shared/core/portal-links';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyCaptcha } from '@/lib/captcha';
import { requestLoginOtp, signInWithEmailOtp } from '@/modules/core/services/login-otp.service';
import { SESSION_COOKIE } from '@/modules/core/services/session.service';
export interface EmailLoginState {
  step?: 'code';
  email?: string;
  error?: string;
}
export async function emailLoginAction(
  previous: EmailLoginState,
  form: FormData,
): Promise<EmailLoginState> {
  const email = String(form.get('email') ?? '')
    .trim()
    .toLowerCase();
  const tenantSlug = form.has('tenant') ? String(form.get('tenant')) : undefined;
  const step = String(form.get('step') ?? 'request');
  let session;
  try {
    if (step === 'request') {
      await verifyCaptcha(form, 'email_login');
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error('Enter a valid email address.');
      await requestLoginOtp(email, tenantSlug);
      return { step: 'code', email };
    }
    if (step !== 'code') throw new Error('Request a new code.');
    const headerList = await headers();
    session = await signInWithEmailOtp({
      email,
      tenantSlug,
      code: String(form.get('code') ?? ''),
      rememberMe: form.get('rememberMe') === 'on',
      ipAddress: headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      userAgent: headerList.get('user-agent'),
    });
  } catch (error) {
    return { ...previous, error: error instanceof Error ? error.message : 'Sign in failed.' };
  }
  (await cookies()).set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(form.get('rememberMe') === 'on' ? { expires: session.expiresAt } : {}),
  });
  const user = await resolveAuthenticatedUser(session.token);
  redirect(
    user?.workspaceAccess && user.workspaceAccess !== 'allowed'
      ? '/workspace-status'
      : portalPath(user?.tenantSlug),
  );
}

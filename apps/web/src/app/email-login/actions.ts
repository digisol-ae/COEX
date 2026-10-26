'use server';
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
  const step = String(form.get('step') ?? 'request');
  let session;
  try {
    if (step === 'request') {
      await verifyCaptcha(form, 'email_login');
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error('Enter a valid email address.');
      await requestLoginOtp(email);
      return { step: 'code', email };
    }
    if (step !== 'code') throw new Error('Request a new code.');
    const headerList = await headers();
    session = await signInWithEmailOtp({
      email,
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
  redirect('/portal');
}

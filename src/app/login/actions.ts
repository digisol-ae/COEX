'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { signInWithPassword } from '@/modules/core/services/auth.service';
import { SESSION_COOKIE, revokeSession } from '@/modules/core/services/session.service';

export interface LoginState {
  error?: string;
}

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Enter your email address and password.' };
  }

  const headerList = await headers();

  const result = await signInWithPassword({
    email,
    password,
    ipAddress: headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: headerList.get('user-agent'),
  });

  if (!result.ok || !result.token) {
    return { error: result.error ?? 'Sign in failed.' };
  }

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, result.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: result.expiresAt,
  });

  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await revokeSession(token);
  }

  cookieStore.delete(SESSION_COOKIE);
  redirect('/login');
}

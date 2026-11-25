'use server';
import { verifyCaptcha } from '@/lib/captcha';
import { resolveAuthenticatedUser } from '@/modules/core/services/auth-context.service';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { signInWithPassword } from '@/modules/core/services/auth.service';
import { SESSION_COOKIE, revokeSession } from '@/modules/core/services/session.service';
import { publicPortalTenant } from '@/modules/portal/tenant';
import { portalPath, portalAuthPath } from '@coex/shared/core/portal-links';

export interface LoginState {
  error?: string;
}

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Enter your email address and password.' };
  }

  try {
    await verifyCaptcha(formData, 'login');
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Security check failed.' };
  }

  const headerList = await headers();

  const result = await signInWithPassword({
    email,
    password,
    tenantSlug: formData.has('tenant') ? String(formData.get('tenant')) : undefined,
    accountKind: formData.get('accountKind') === 'staff' ? 'staff' : 'portal',
    rememberMe: formData.get('rememberMe') === 'on',
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
    ...(formData.get('rememberMe') === 'on' ? { expires: result.expiresAt } : {}),
  });

  const user = await resolveAuthenticatedUser(result.token);
  redirect(
    user?.workspaceAccess && user.workspaceAccess !== 'allowed'
      ? '/workspace-status'
      : user?.role === 'client_contact'
        ? portalPath(user.tenantSlug)
        : '/dashboard',
  );
}

export async function logoutAction(form?: FormData): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await revokeSession(token);
  }

  cookieStore.delete(SESSION_COOKIE);
  const tenant = form?.has('tenant') ? await publicPortalTenant(String(form.get('tenant'))) : null;
  redirect(portalAuthPath('/login', tenant?.slug));
}

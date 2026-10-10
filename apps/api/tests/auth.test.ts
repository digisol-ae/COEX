import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../../../tests/setup';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { SessionModel } from '@coex/shared/core/models/session.model';
import { AuditLogModel } from '@coex/shared/core/models/audit-log.model';
import { EmailOutboxModel } from '@coex/shared/core/models/email-outbox.model';
import { EmailSettingsModel } from '@coex/shared/core/models/email-settings.model';
import { hashPassword } from '@/lib/password';
import { createApp } from '../src/app';
import { buildRoutes } from '../src/routes';

const config = { allowedOrigins: ['https://coex.digisol.ae'] };
// Limits high enough that only the dedicated rate limit tests ever hit them.
const generousApp = createApp(
  config,
  buildRoutes({ authLimits: { loginAttempts: 1000, resetRequests: 1000, windowMs: 60_000 } }),
);

const tenantId = new Types.ObjectId();
const userId = new Types.ObjectId();
const PASSWORD = 'correct horse battery staple 42';

const cookieOf = (response: request.Response, name: string): string | undefined =>
  (response.headers['set-cookie'] as unknown as string[] | undefined)?.find((line) =>
    line.startsWith(`${name}=`),
  );

beforeAll(async () => {
  await connectForTests('api_auth');
});

afterAll(async () => {
  await disconnectFromTests();
});

beforeEach(async () => {
  await clearDatabase();
  await TenantModel.create({ _id: tenantId, name: 'DigiSol', slug: 'digisol' });
  await UserModel.create({
    _id: userId,
    tenantId,
    name: 'Ali Agent',
    email: 'ali@digisol.ae',
    role: 'tenant_admin',
    status: 'active',
    passwordHash: await hashPassword(PASSWORD),
  });
});

describe('password sign in', () => {
  it('signs in, sets the same httpOnly cookie the web app sets, and the cookie then works', async () => {
    const response = await request(generousApp)
      .post('/api/v2/auth/login')
      .send({ email: ' ALI@digisol.ae ', password: PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ email: 'ali@digisol.ae', role: 'tenant_admin' });

    const cookie = cookieOf(response, 'coex_session')!;
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('Expires=');

    const me = await request(generousApp).get('/api/v2/me').set('Cookie', cookie.split(';')[0]);
    expect(me.status).toBe(200);
    expect(me.body.name).toBe('Ali Agent');

    expect(await AuditLogModel.countDocuments({ action: 'auth.sign_in' })).toBe(1);
  });

  it('answers a wrong password and an unknown email identically, and audits the failure', async () => {
    const wrong = await request(generousApp)
      .post('/api/v2/auth/login')
      .send({ email: 'ali@digisol.ae', password: 'not it' });
    const unknown = await request(generousApp)
      .post('/api/v2/auth/login')
      .send({ email: 'nobody@digisol.ae', password: 'not it' });

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error).toEqual(unknown.body.error);
    expect(wrong.body.error.code).toBe('invalid_credentials');
    expect(cookieOf(wrong, 'coex_session')).toBeUndefined();
    expect(await AuditLogModel.countDocuments({ action: 'auth.sign_in_failed' })).toBe(1);
  });

  it('refuses a suspended account and a missing field', async () => {
    await UserModel.updateOne({ _id: userId }, { $set: { status: 'suspended' } });

    const suspended = await request(generousApp)
      .post('/api/v2/auth/login')
      .send({ email: 'ali@digisol.ae', password: PASSWORD });
    expect(suspended.status).toBe(401);
    expect(suspended.body.error.message).toContain('not active');

    const missing = await request(generousApp).post('/api/v2/auth/login').send({ email: 'x@y.z' });
    expect(missing.status).toBe(400);
  });

  it('rate limits repeated attempts for the same address and email, but not another email', async () => {
    const limited = createApp(
      config,
      buildRoutes({ authLimits: { loginAttempts: 3, resetRequests: 2, windowMs: 60_000 } }),
    );
    const attempt = (email: string) =>
      request(limited).post('/api/v2/auth/login').send({ email, password: 'wrong' });

    for (let i = 0; i < 3; i += 1) expect((await attempt('ali@digisol.ae')).status).toBe(401);

    const blocked = await attempt('ali@digisol.ae');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('too_many_requests');
    expect(blocked.headers['retry-after']).toBeDefined();

    expect((await attempt('other@digisol.ae')).status).toBe(401);
  });

  it('refuses a sign in posted from another site', async () => {
    const response = await request(generousApp)
      .post('/api/v2/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ email: 'ali@digisol.ae', password: PASSWORD });

    expect(response.status).toBe(403);
  });
});

describe('sign out', () => {
  it('ends the session for good and clears the cookie', async () => {
    const login = await request(generousApp)
      .post('/api/v2/auth/login')
      .send({ email: 'ali@digisol.ae', password: PASSWORD });
    const cookie = cookieOf(login, 'coex_session')!.split(';')[0];

    const out = await request(generousApp).post('/api/v2/auth/logout').set('Cookie', cookie);
    expect(out.status).toBe(200);
    expect(cookieOf(out, 'coex_session')).toContain('Expires=Thu, 01 Jan 1970');

    expect((await request(generousApp).get('/api/v2/me').set('Cookie', cookie)).status).toBe(401);
    expect(await SessionModel.countDocuments({ revokedAt: { $ne: null } })).toBe(1);
  });

  it('is harmless without a session', async () => {
    expect((await request(generousApp).post('/api/v2/auth/logout')).status).toBe(200);
  });
});

describe('password reset', () => {
  async function emailOn() {
    await EmailSettingsModel.create({
      tenantId,
      outbound: {
        enabled: true,
        host: 'smtp.example.com',
        username: 'helpdesk@example.com',
        fromName: 'Support',
        fromAddress: 'helpdesk@example.com',
      },
    });
  }

  it('answers the same whether or not the address has an account', async () => {
    await emailOn();

    const known = await request(generousApp)
      .post('/api/v2/auth/forgot-password')
      .send({ email: 'ali@digisol.ae' });
    const unknown = await request(generousApp)
      .post('/api/v2/auth/forgot-password')
      .send({ email: 'nobody@digisol.ae' });

    expect(known.status).toBe(200);
    expect(known.body).toEqual({ sent: true });
    expect(unknown.body).toEqual(known.body);
    expect(await EmailOutboxModel.countDocuments({ kind: 'password_reset' })).toBe(1);
  });

  it('lets someone choose a new password once, then signs every device out', async () => {
    await emailOn();
    const login = await request(generousApp)
      .post('/api/v2/auth/login')
      .send({ email: 'ali@digisol.ae', password: PASSWORD });
    const oldCookie = cookieOf(login, 'coex_session')!.split(';')[0];

    await request(generousApp)
      .post('/api/v2/auth/forgot-password')
      .send({ email: 'ali@digisol.ae' });
    const mail = await EmailOutboxModel.findOne({ kind: 'password_reset' });
    const token = /token=([\w-]+)/.exec(mail!.text)![1];

    expect(
      (await request(generousApp).post('/api/v2/auth/reset-password/check').send({ token })).body,
    ).toEqual({ valid: true });

    const mismatch = await request(generousApp)
      .post('/api/v2/auth/reset-password')
      .send({ token, password: 'a brand new long passphrase 7', confirm: 'different' });
    expect(mismatch.status).toBe(422);
    expect(mismatch.body.error.message).toContain('do not match');

    const weak = await request(generousApp)
      .post('/api/v2/auth/reset-password')
      .send({ token, password: 'short', confirm: 'short' });
    expect(weak.status).toBe(422);

    const NEW = 'a brand new long passphrase 7';
    const done = await request(generousApp)
      .post('/api/v2/auth/reset-password')
      .send({ token, password: NEW, confirm: NEW });
    expect(done.status).toBe(200);
    expect(done.body).toEqual({ done: true });

    // The old session is gone, the old password no longer works, the new one does.
    expect((await request(generousApp).get('/api/v2/me').set('Cookie', oldCookie)).status).toBe(
      401,
    );
    expect(
      (
        await request(generousApp)
          .post('/api/v2/auth/login')
          .send({ email: 'ali@digisol.ae', password: PASSWORD })
      ).status,
    ).toBe(401);
    expect(
      (
        await request(generousApp)
          .post('/api/v2/auth/login')
          .send({ email: 'ali@digisol.ae', password: NEW })
      ).status,
    ).toBe(200);

    // A link works once.
    expect(
      (await request(generousApp).post('/api/v2/auth/reset-password/check').send({ token })).body,
    ).toEqual({ valid: false });
    const again = await request(generousApp)
      .post('/api/v2/auth/reset-password')
      .send({ token, password: NEW, confirm: NEW });
    expect(again.status).toBe(422);
    expect(again.body.error.message).toContain('expired or was already used');
  });

  it('rate limits reset requests per address', async () => {
    const limited = createApp(
      config,
      buildRoutes({ authLimits: { loginAttempts: 10, resetRequests: 2, windowMs: 60_000 } }),
    );
    const ask = () =>
      request(limited).post('/api/v2/auth/forgot-password').send({ email: 'ali@digisol.ae' });

    expect((await ask()).status).toBe(200);
    expect((await ask()).status).toBe(200);
    expect((await ask()).status).toBe(429);
  });
});

describe('Microsoft Entra', () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  function configureEntra() {
    process.env.AUTH_MICROSOFT_ENTRA_ID_ID = 'client-id';
    process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET = 'client-secret';
    process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER =
      'https://login.microsoftonline.com/3788e905-c187-4e8b-bafb-84b7e0ec3f1c/v2.0';
    process.env.AUTH_URL = 'https://coex.digisol.ae';
  }

  it('sends the person back to the sign in page when Microsoft sign in is not configured', async () => {
    delete process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET;

    const response = await request(generousApp).get('/api/v2/auth/entra');
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login?entra=not-configured');
  });

  it('redirects to Microsoft with a one time state, keeping the state in an httpOnly cookie and asking Microsoft to return to the API', async () => {
    configureEntra();

    const response = await request(generousApp).get('/api/v2/auth/entra');
    expect(response.status).toBe(302);

    const location = new URL(response.headers.location);
    expect(location.origin).toBe('https://login.microsoftonline.com');
    expect(location.pathname).toBe('/3788e905-c187-4e8b-bafb-84b7e0ec3f1c/oauth2/v2.0/authorize');
    expect(location.searchParams.get('redirect_uri')).toBe(
      'https://coex.digisol.ae/api/v2/auth/entra/callback',
    );
    expect(location.searchParams.get('code_challenge_method')).toBe('S256');
    expect(location.searchParams.get('state')).toBeTruthy();

    const state = cookieOf(response, 'coex_entra_state')!;
    expect(state).toContain('HttpOnly');
  });

  it('sends a cancelled, tampered or unverifiable return to the sign in page without signing anyone in', async () => {
    configureEntra();

    const cancelled = await request(generousApp).get(
      '/api/v2/auth/entra/callback?error=access_denied',
    );
    expect(cancelled.headers.location).toBe('/login?entra=cancelled');

    const noCookie = await request(generousApp).get(
      '/api/v2/auth/entra/callback?code=abc&state=xyz',
    );
    expect(noCookie.status).toBe(302);
    expect(noCookie.headers.location).toBe('/login?entra=failed');
    expect(cookieOf(noCookie, 'coex_session')).toBeUndefined();
    expect(await SessionModel.countDocuments()).toBe(0);
  });
});

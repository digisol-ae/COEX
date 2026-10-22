import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ complete: vi.fn(), signIn: vi.fn(), start: vi.fn() }));
vi.mock('@/modules/core/services/entra.service', async (original) => ({
  ...(await original<object>()),
  completeEntraSignIn: mocks.complete,
  startEntraSignIn: mocks.start,
}));
vi.mock('@/modules/core/services/auth.service', () => ({ signInWithEntra: mocks.signIn }));
import { GET } from '@/app/api/auth/entra/callback/route';
import { GET as start } from '@/app/api/auth/entra/route';
import { entraReturnUrl } from '@/modules/core/services/entra.service';
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('AUTH_URL', 'https://coex.digisol.ae');
  vi.stubEnv('COEX_APP_URL', '');
  mocks.complete.mockResolvedValue({ email: 'test@example.com', subject: 'test-only' });
  mocks.signIn.mockResolvedValue({
    ok: true,
    token: 'synthetic-test-session',
    expiresAt: new Date('2026-12-01'),
  });
});
afterEach(() => vi.unstubAllEnvs());
const callback = () =>
  new NextRequest('http://localhost:3002/api/auth/entra/callback?code=test&state=test', {
    headers: { 'x-forwarded-host': 'other.example', 'x-forwarded-proto': 'http' },
  });
describe('Microsoft sign-in redirects behind a reverse proxy', () => {
  it('returns successful sign-in to the public dashboard and sets the session', async () => {
    const response = await GET(callback());
    expect(response.headers.get('location')).toBe('https://coex.digisol.ae/dashboard');
    expect(response.cookies.get('coex_session')?.value).toBe('synthetic-test-session');
    expect(response.cookies.get('coex_entra_state')?.value).toBe('');
  });
  it('returns rejected accounts to the public sign-in page without a session', async () => {
    mocks.signIn.mockResolvedValue({ ok: false });
    const response = await GET(callback());
    expect(response.headers.get('location')).toBe('https://coex.digisol.ae/login?entra=account');
    expect(response.cookies.has('coex_session')).toBe(false);
  });
  it('returns validation failures to the public sign-in page', async () => {
    mocks.complete.mockRejectedValue(new Error('test failure'));
    const response = await GET(callback());
    expect(response.headers.get('location')).toBe('https://coex.digisol.ae/login?entra=failed');
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
  it('returns cancelled sign-in to the public site', async () => {
    const response = await GET(
      new NextRequest('http://localhost:3002/api/auth/entra/callback?error=access_denied'),
    );
    expect(response.headers.get('location')).toBe('https://coex.digisol.ae/login?entra=cancelled');
    expect(mocks.complete).not.toHaveBeenCalled();
  });
  it('keeps local preview redirects on the configured local port', async () => {
    vi.stubEnv('AUTH_URL', 'http://localhost:3106');
    expect((await GET(callback())).headers.get('location')).toBe('http://localhost:3106/dashboard');
  });
  it('uses COEX_APP_URL when AUTH_URL is blank', async () => {
    vi.stubEnv('AUTH_URL', '');
    vi.stubEnv('COEX_APP_URL', 'https://coex.digisol.ae');
    expect((await GET(callback())).headers.get('location')).toBe(
      'https://coex.digisol.ae/dashboard',
    );
  });
  it('keeps not-configured failures on the configured public site', async () => {
    mocks.start.mockImplementation(() => {
      throw new Error('Not configured');
    });
    expect((await start()).headers.get('location')).toBe(
      'https://coex.digisol.ae/login?entra=not-configured',
    );
  });
  it('does not permit an off-site sign-in destination', () => {
    expect(() => entraReturnUrl('//other.example/dashboard')).toThrow();
  });
});

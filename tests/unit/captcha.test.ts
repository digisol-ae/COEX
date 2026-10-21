import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyCaptcha } from '@/lib/captcha';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function setup() {
  vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'site');
  vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');
  vi.stubEnv('TURNSTILE_HOSTNAMES', 'coex.example');
  const form = new FormData();
  form.set('cf-turnstile-response', 'token');
  return form;
}
describe('CAPTCHA server verification', () => {
  it('leaves unconfigured installations unchanged', async () => {
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', '');
    vi.stubEnv('TURNSTILE_SECRET_KEY', '');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await verifyCaptcha(new FormData(), 'login');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects partial configuration and missing tokens', async () => {
    const form = setup();
    vi.stubEnv('TURNSTILE_SECRET_KEY', '');
    await expect(verifyCaptcha(form, 'login')).rejects.toThrow('unavailable');
    setup();
    await expect(verifyCaptcha(new FormData(), 'login')).rejects.toThrow('complete');
  });
  it.each([
    { success: false, action: 'login', hostname: 'coex.example' },
    { success: true, action: 'portal_reply', hostname: 'coex.example' },
    { success: true, action: 'login', hostname: 'evil.example' },
  ])('rejects failed, wrong-action or wrong-host tokens: %j', async (result) => {
    const form = setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => result }));
    await expect(verifyCaptcha(form, 'login')).rejects.toThrow('failed or expired');
  });
  it('rejects network failure and absent hostname configuration', async () => {
    const form = setup();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(verifyCaptcha(form, 'login')).rejects.toThrow('failed');
    vi.stubEnv('TURNSTILE_HOSTNAMES', '');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, action: 'login', hostname: 'coex.example' }),
      }),
    );
    await expect(verifyCaptcha(form, 'login')).rejects.toThrow('failed');
  });
  it('accepts verified action and allowed hostname with server secret', async () => {
    const form = setup();
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, action: 'portal_ticket', hostname: 'coex.example' }),
    });
    vi.stubGlobal('fetch', fetch);
    await verifyCaptcha(form, 'portal_ticket');
    expect(fetch.mock.calls[0][1].body.get('secret')).toBe('secret');
    expect(fetch.mock.calls[0][1].body.get('response')).toBe('token');
  });
});

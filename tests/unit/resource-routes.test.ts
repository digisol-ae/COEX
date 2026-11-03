import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  user: null as null | { role: string; permissions: string[] },
  save: vi.fn(),
  list: vi.fn().mockResolvedValue([]),
  recipients: vi.fn().mockResolvedValue([]),
  verify: vi.fn(),
  resend: vi.fn(),
  file: vi.fn(),
}));
vi.mock('@/lib/session', () => ({
  getSignedInUser: async () => mocks.user,
  asUser: async (_u: unknown, fn: () => unknown) => fn(),
}));
vi.mock('@/modules/resources/service', () => ({
  saveResource: mocks.save,
  listResources: mocks.list,
  resourceRecipients: mocks.recipients,
  verifyResourceOtp: mocks.verify,
  resendResourceOtp: mocks.resend,
  staffResourceFile: mocks.file,
}));
import { POST as upload, GET as library } from '@/app/api/resources/route';
import { POST as access } from '@/app/shared/resources/[token]/access/route';
import { GET as recipients } from '@/app/api/resources/recipients/route';
const token = 'a'.repeat(43);
const publicParams = { params: Promise.resolve({ token }) };
const request = (
  origin = 'https://worktello.example',
  data: unknown = { action: 'verify', code: '12345678' },
) =>
  new Request(`https://worktello.example/shared/resources/${token}/access`, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(data),
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = null;
});
afterEach(() => vi.unstubAllEnvs());
describe('resource HTTP guards', () => {
  it('refuses unauthenticated, customer and read-only document uploads', async () => {
    for (const user of [
      null,
      { role: 'client_contact', permissions: ['resource.manage'] },
      { role: 'agent', permissions: ['resource.read'] },
    ]) {
      mocks.user = user;
      expect(
        (await upload(new Request('https://worktello.example/api/resources', { method: 'POST' })))
          .status,
      ).toBe(403);
    }
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('requires explicit staff read/share permissions for lists and customer lookup', async () => {
    expect((await library(new Request('https://worktello.example/api/resources'))).status).toBe(
      403,
    );
    mocks.user = { role: 'agent', permissions: ['resource.read'] };
    expect((await library(new Request('https://worktello.example/api/resources'))).status).toBe(
      200,
    );
    expect(
      (
        await recipients(
          new Request('https://worktello.example/api/resources/recipients?search=QA'),
        )
      ).status,
    ).toBe(403);
  });
  it('rejects foreign or missing origins before uploads and OTP verification', async () => {
    mocks.user = { role: 'tenant_admin', permissions: ['resource.manage'] };
    expect(
      (
        await upload(
          new Request('https://worktello.example/api/resources', {
            method: 'POST',
            headers: { origin: 'https://attacker.example' },
          }),
        )
      ).status,
    ).toBe(403);
    expect((await access(request('https://attacker.example'), publicParams)).status).toBe(403);
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('issues a share-scoped HttpOnly browser cookie, with the original expiry and no login cookie', async () => {
    const expires = new Date(Date.now() + 3600000);
    mocks.verify.mockResolvedValue({
      shareId: 'abc123',
      browserToken: 'browser-secret',
      expiresAt: expires,
    });
    const response = await access(request(), publicParams);
    const cookie = response.headers.get('set-cookie')!;
    expect(response.status).toBe(200);
    expect(cookie).toContain('resource_access_abc123=browser-secret');
    expect(cookie).toContain(`Path=/shared/resources/${token}`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie.toLowerCase()).toContain('samesite=lax');
    expect(cookie).not.toContain('coex_session');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it('does not expose database errors or issue a cookie when verification fails', async () => {
    mocks.verify.mockRejectedValue(new Error('MongoDB internal secret collection'));
    const response = await access(request(), publicParams);
    expect(response.status).toBe(400);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(JSON.stringify(await response.json())).not.toContain('MongoDB');
  });
});

it('does not bypass a denied customer directory through resource sharing', async () => {
  mocks.user = { role: 'agent', permissions: ['resource.share'] };
  expect(
    (
      await recipients(
        new Request('https://worktello.example/api/resources/recipients?search=Customer'),
      )
    ).status,
  ).toBe(403);
  expect(mocks.recipients).not.toHaveBeenCalled();
  mocks.user = { role: 'agent', permissions: ['resource.share', 'customer.read'] };
  expect(
    (
      await recipients(
        new Request('https://worktello.example/api/resources/recipients?search=Customer'),
      )
    ).status,
  ).toBe(200);
});

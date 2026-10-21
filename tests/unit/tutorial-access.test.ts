import { beforeEach, describe, expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => ({ user: null as unknown }));
vi.mock('@/lib/session', () => ({ getSignedInUser: async () => auth.user, asUser: vi.fn() }));
import { GET, POST } from '@/app/api/tutorials/route';
import { GET as video } from '@/app/api/tutorials/video/route';
beforeEach(() => {
  auth.user = null;
});
describe('tutorial access guards', () => {
  it('requires sign-in for metadata and video', async () => {
    expect((await GET(new Request('http://localhost/api/tutorials'))).status).toBe(401);
    expect((await video(new Request('http://localhost/api/tutorials/video'))).status).toBe(401);
  });
  it('rejects cross-origin writes before touching data', async () => {
    auth.user = { permissions: ['tenant.manage'] };
    expect(
      (
        await POST(
          new Request('http://localhost/api/tutorials', {
            method: 'POST',
            headers: { origin: 'https://other.example' },
            body: '{}',
          }),
        )
      ).status,
    ).toBe(403);
  });
  it('does not let ordinary users upload videos', async () => {
    auth.user = { permissions: [] };
    expect(
      (
        await POST(
          new Request('http://localhost/api/tutorials', {
            method: 'POST',
            headers: {
              origin: 'http://localhost',
              'content-type': 'multipart/form-data; boundary=test',
            },
            body: '--test--',
          }),
        )
      ).status,
    ).toBe(403);
  });
});

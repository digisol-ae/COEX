import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => ({ user: null as unknown }));
const scope = vi.hoisted(() => ({ run: vi.fn(), write: vi.fn() }));
vi.mock('@/modules/tutorials/service', () => ({
  currentTutorial: async () => null,
  tutorialView: vi.fn(),
}));
vi.mock('@/modules/core/services/audit.service', () => ({ recordAudit: vi.fn() }));
vi.mock('@/lib/tenant-context', () => ({
  getContext: () => ({ tenantId: 'aaaaaaaaaaaaaaaaaaaaaaaa', userId: 'bbbbbbbbbbbbbbbbbbbbbbbb' }),
}));
vi.mock('@coex/shared/core/models/tutorial.model', () => ({
  TutorialModel: { updateOne: scope.write },
  TutorialSeenModel: { updateOne: vi.fn() },
}));
vi.mock('@/lib/session', () => ({ getSignedInUser: async () => auth.user, asUser: scope.run }));
import { GET, POST } from '@/app/api/tutorials/route';
import { GET as video } from '@/app/api/tutorials/video/route';
beforeEach(() => {
  auth.user = null;
  vi.unstubAllEnvs();
  vi.stubEnv('COEX_APP_URL', '');
  vi.stubEnv('AUTH_URL', '');
  scope.write.mockReset().mockResolvedValue({});
  scope.run.mockReset().mockImplementation((_user, callback) => callback());
});
afterEach(() => vi.unstubAllEnvs());
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

describe('tutorial writes behind a reverse proxy', () => {
  it('accepts the configured HTTPS origin despite an internal HTTP request URL', async () => {
    vi.stubEnv('COEX_APP_URL', 'https://coex.digisol.ae');
    auth.user = { permissions: ['tenant.manage'] };
    const response = await POST(
      new Request('http://localhost:3001/api/tutorials', {
        method: 'POST',
        headers: { origin: 'https://coex.digisol.ae', 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'link',
          title: 'Tutorial',
          url: 'https://www.youtube.com/embed/YbtJo8nMQRI?si=FmNDSFsWTcgmAk4D',
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(scope.run).toHaveBeenCalledOnce();
    expect(scope.write).toHaveBeenCalledWith(
      { tenantId: 'aaaaaaaaaaaaaaaaaaaaaaaa' },
      {
        $set: expect.objectContaining({
          title: 'Tutorial',
          videoUrl: 'https://www.youtube-nocookie.com/embed/YbtJo8nMQRI?autoplay=0&rel=0',
          active: false,
        }),
      },
      { upsert: true },
    );
  });
  it('does not trust a forged forwarded host or an unconfigured origin', async () => {
    vi.stubEnv('COEX_APP_URL', 'https://coex.digisol.ae');
    auth.user = { permissions: ['tenant.manage'] };
    const response = await POST(
      new Request('http://localhost:3001/api/tutorials', {
        method: 'POST',
        headers: {
          origin: 'https://other.example',
          'x-forwarded-host': 'other.example',
          'x-forwarded-proto': 'https',
        },
        body: '{}',
      }),
    );
    expect(response.status).toBe(403);
    expect(scope.run).not.toHaveBeenCalled();
    expect((await response.json()).error).toContain('Refresh COEX');
  });
  it('continues accepting same-origin local preview writes', async () => {
    vi.stubEnv('COEX_APP_URL', 'https://coex.digisol.ae');
    auth.user = { permissions: ['tenant.manage'] };
    const response = await POST(
      new Request('http://localhost:3106/api/tutorials', {
        method: 'POST',
        headers: { origin: 'http://localhost:3106' },
        body: JSON.stringify({
          action: 'link',
          title: 'Local tutorial',
          url: 'https://youtu.be/YbtJo8nMQRI',
        }),
      }),
    );
    expect(response.status).toBe(200);
  });
  it('rejects a missing browser origin', async () => {
    auth.user = { permissions: ['tenant.manage'] };
    expect(
      (await POST(new Request('http://localhost/api/tutorials', { method: 'POST', body: '{}' })))
        .status,
    ).toBe(403);
    expect(scope.run).not.toHaveBeenCalled();
  });
});

it('still requires administrator permission for JSON video-link saves', async () => {
  auth.user = { permissions: [] };
  const response = await POST(
    new Request('http://localhost/api/tutorials', {
      method: 'POST',
      headers: { origin: 'http://localhost', 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'link',
        title: 'Tutorial',
        url: 'https://youtu.be/YbtJo8nMQRI',
      }),
    }),
  );
  expect(response.status).toBe(403);
  expect(scope.write).not.toHaveBeenCalled();
});

it('uses AUTH_URL when the optional public app URL is blank', async () => {
  vi.stubEnv('AUTH_URL', 'https://coex.digisol.ae');
  auth.user = { permissions: ['tenant.manage'] };
  const response = await POST(
    new Request('http://localhost:3001/api/tutorials', {
      method: 'POST',
      headers: { origin: 'https://coex.digisol.ae', 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'link',
        title: 'Tutorial',
        url: 'https://youtu.be/YbtJo8nMQRI',
      }),
    }),
  );
  expect(response.status).toBe(200);
  expect(scope.write).toHaveBeenCalledOnce();
});

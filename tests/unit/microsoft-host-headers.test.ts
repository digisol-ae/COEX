import { describe, expect, it } from 'vitest';
import config from '../../apps/web/next.config';

describe('embedded Microsoft workspace headers', () => {
  it('allows the approved web hosts only on the integration pages', async () => {
    const rules = await config.headers!();
    expect(rules.map((rule) => rule.source).sort()).toEqual([
      '/integrations/outlook/:path*',
      '/integrations/teams/:path*',
    ]);
    const teams = rules.find((rule) => rule.source === '/integrations/teams/:path*')!;
    const outlook = rules.find((rule) => rule.source === '/integrations/outlook/:path*')!;
    const outlookHeaders = Object.fromEntries(
      outlook.headers.map(({ key, value }) => [key, value]),
    );
    expect(outlookHeaders['Content-Security-Policy']).toBe(
      "frame-ancestors 'self' https://outlook.office.com https://outlook.office365.com https://*.outlook.com https://*.cloud.microsoft",
    );
    expect(outlookHeaders['Cache-Control']).toBe('no-store');
    expect(outlookHeaders['Referrer-Policy']).toBe('no-referrer');
    const headers = Object.fromEntries(teams.headers.map(({ key, value }) => [key, value]));
    const ancestors = headers['Content-Security-Policy'].split(' ').slice(1);
    expect(ancestors).toEqual([
      "'self'",
      'https://teams.microsoft.com',
      'https://*.teams.microsoft.com',
      'https://*.cloud.microsoft',
      'https://*.skype.com',
      'https://outlook.office.com',
      'https://outlook.office365.com',
    ]);
    expect(headers['Cache-Control']).toBe('no-store');
    expect(headers['Referrer-Policy']).toBe('no-referrer');
  });
});

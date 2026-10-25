import { describe, expect, it } from 'vitest';
import config from '../../apps/web/next.config';

describe('embedded Microsoft workspace headers', () => {
  it('allows the approved web hosts only on the integration pages', async () => {
    const rules = await config.headers!();
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe('/integrations/teams/:path*');
    const headers = Object.fromEntries(rules[0].headers.map(({ key, value }) => [key, value]));
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

import { beforeAll, describe, expect, it } from 'vitest';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { TEAMS_CLIENT_IDS, verifyTeamsTabToken } from '@/modules/integrations/teams/tab-auth';
const settings = {
  appId: '0ee8f3f6-879a-4cf0-95d0-9321696f4473',
  microsoftTenant: '3788e905-c187-4e8b-bafb-84b7e0ec3f1c',
};
const oid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
let pair: Awaited<ReturnType<typeof generateKeyPair>>;
let keys: ReturnType<typeof createLocalJWKSet>;
beforeAll(async () => {
  pair = await generateKeyPair('RS256');
  const publicKey = await exportJWK(pair.publicKey);
  keys = createLocalJWKSet({ keys: [{ ...publicKey, kid: 'test', alg: 'RS256' }] });
});
async function token(overrides: Record<string, unknown> = {}) {
  return new SignJWT({
    ver: '2.0',
    tid: settings.microsoftTenant,
    oid,
    scp: 'access_as_user',
    azp: TEAMS_CLIENT_IDS[0],
    ...overrides,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setAudience(settings.appId)
    .setIssuer(`https://login.microsoftonline.com/${settings.microsoftTenant}/v2.0`)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(pair.privateKey);
}
describe('Teams personal tab identity', () => {
  it('accepts a signed delegated token for this app and tenant', async () => {
    expect(await verifyTeamsTabToken(await token(), settings, keys)).toBe(oid);
  });
  it.each([
    { tid: 'another-tenant' },
    { ver: '1.0' },
    { oid: 'email@example.com' },
    { scp: 'User.Read' },
    { azp: 'untrusted-client' },
    { scp: undefined },
  ])('rejects mismatched claims %j', async (claims) => {
    await expect(verifyTeamsTabToken(await token(claims), settings, keys)).rejects.toThrow();
  });
  it('rejects Graph tokens', async () => {
    const value = await new SignJWT({ oid })
      .setProtectedHeader({ alg: 'RS256', kid: 'test' })
      .setAudience('https://graph.microsoft.com')
      .setIssuer(`https://login.microsoftonline.com/${settings.microsoftTenant}/v2.0`)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(pair.privateKey);
    await expect(verifyTeamsTabToken(value, settings, keys)).rejects.toThrow();
  });
  it('rejects tampering', async () => {
    const value = await token();
    const [head, body, signature] = value.split('.');
    const changed = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(body, 'base64url').toString()),
        oid: 'ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee',
      }),
    ).toString('base64url');
    await expect(
      verifyTeamsTabToken(`${head}.${changed}.${signature}`, settings, keys),
    ).rejects.toThrow();
  });
  it('rejects expired tokens', async () => {
    const value = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'test' })
      .setAudience(settings.appId)
      .setIssuer(`https://login.microsoftonline.com/${settings.microsoftTenant}/v2.0`)
      .setIssuedAt(1)
      .setExpirationTime(2)
      .sign(pair.privateKey);
    await expect(verifyTeamsTabToken(value, settings, keys)).rejects.toThrow();
  });
});

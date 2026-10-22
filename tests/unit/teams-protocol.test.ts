import { describe, it, expect } from 'vitest';
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } from 'jose';
import {
  activitySchema,
  sourceMessage,
  signDraft,
  readDraft,
  taskFieldsSchema,
  verifyConnector,
} from '@/modules/integrations/teams/teams-protocol';

const activity = activitySchema.parse({
  type: 'invoke',
  name: 'composeExtension/fetchTask',
  channelId: 'msteams',
  serviceUrl: 'https://smba.trafficmanager.net/emea/',
  from: { aadObjectId: '11111111-1111-4111-8111-111111111111' },
  channelData: { tenant: { id: '22222222-2222-4222-8222-222222222222' } },
  value: {
    commandId: 'createCoexTask',
    messagePayload: {
      body: { contentType: 'html', content: '<p>Fix &amp; check</p><div>Today</div>' },
      linkToMessage: 'https://teams.microsoft.com/l/message/test/123',
    },
  },
});
const secret = new TextEncoder().encode('test-secret-only-012345678901234567890');

describe('Teams task protocol', () => {
  it('converts selected HTML into plain text and preserves the source link', () => {
    expect(sourceMessage(activity)).toEqual({
      text: 'Fix & check\nToday',
      url: 'https://teams.microsoft.com/l/message/test/123',
    });
  });
  it('rejects non-Teams links, fake commands and missing identity', () => {
    expect(() =>
      sourceMessage({
        ...activity,
        value: {
          ...activity.value,
          messagePayload: {
            ...activity.value.messagePayload!,
            linkToMessage: 'https://teams.microsoft.com.evil.test/',
          },
        },
      }),
    ).toThrow();
    expect(activitySchema.safeParse({ ...activity, from: {} }).success).toBe(false);
    expect(activitySchema.safeParse({ ...activity, value: { commandId: 'other' } }).success).toBe(
      false,
    );
  });
  it('binds signed source drafts to the staff account and COEX tenant', async () => {
    const draft = await signDraft(
      { sub: 'actor', tenant: 'tenant', ...sourceMessage(activity) },
      secret,
    );
    expect((await readDraft(draft, 'actor', 'tenant', secret)).text).toContain('Fix');
    await expect(readDraft(draft, 'other', 'tenant', secret)).rejects.toThrow();
    await expect(readDraft(draft, 'actor', 'other', secret)).rejects.toThrow();
    await expect(
      readDraft(draft, 'actor', 'tenant', new TextEncoder().encode('wrong')),
    ).rejects.toThrow();
    const expired = await new SignJWT({ sub: 'actor', tenant: 'tenant' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('coex-teams')
      .setAudience('coex-teams-task')
      .setIssuedAt()
      .setJti('11111111-1111-4111-8111-111111111111')
      .setExpirationTime(1)
      .sign(secret);
    await expect(readDraft(expired, 'actor', 'tenant', secret)).rejects.toThrow();
  });
  it('rejects impossible dates and malformed destination IDs', () => {
    const valid = {
      title: 'Task',
      draft: 'signed',
      destination: 'a'.repeat(24),
      dueDate: '2026-10-22',
    };
    expect(taskFieldsSchema.safeParse(valid).success).toBe(true);
    expect(taskFieldsSchema.safeParse({ ...valid, dueDate: '2026-02-30' }).success).toBe(false);
    expect(taskFieldsSchema.safeParse({ ...valid, destination: 'other-tenant' }).success).toBe(
      false,
    );
    expect(taskFieldsSchema.safeParse({ ...valid, title: ' ' }).success).toBe(false);
  });
  it('requires a genuine connector signature, audience, service URL and channel endorsement', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwk = { ...(await exportJWK(publicKey)), kid: 'test', endorsements: ['msteams'] };
    const jwks = { keys: [jwk] };
    const resolver = createLocalJWKSet(jwks);
    const token = await new SignJWT({ serviceurl: activity.serviceUrl })
      .setProtectedHeader({ alg: 'RS256', kid: 'test' })
      .setIssuer('https://api.botframework.com')
      .setAudience('bot-id')
      .setNotBefore('0s')
      .setExpirationTime('5m')
      .sign(privateKey);
    await expect(
      verifyConnector(`Bearer ${token}`, activity, 'bot-id', resolver),
    ).resolves.toBeUndefined();
    await expect(verifyConnector(null, activity, 'bot-id', resolver)).rejects.toThrow();
    await expect(
      verifyConnector(`Bearer ${token}`, activity, 'wrong-id', resolver),
    ).rejects.toThrow();
    await expect(
      verifyConnector(
        `Bearer ${token}`,
        { ...activity, serviceUrl: 'https://evil.test/' },
        'bot-id',
        resolver,
      ),
    ).rejects.toThrow();
    const unendorsed = { keys: [{ ...jwk, endorsements: [] }] };
    const badResolver = createLocalJWKSet(unendorsed);
    await expect(
      verifyConnector(`Bearer ${token}`, activity, 'bot-id', badResolver),
    ).rejects.toThrow();
  });
});

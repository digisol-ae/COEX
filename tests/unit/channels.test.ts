import { describe, expect, it } from 'vitest';
import {
  ackSchema,
  inboundSchema,
  parseBatch,
  statusSchema,
  toE164,
} from '@/modules/channels/canonical';
import { signPayload, verifySignature } from '@/modules/channels/signature';
import { mockProvider, providerFor, ProviderNotReadyError } from '@/modules/channels/providers';
import {
  retryDelayMs,
  shouldApplyStatus,
} from '@/modules/channels/services/channel-messages.service';

/**
 * M6.1: the canonical Channel API, request signing and the outbox rules. No database: these are
 * the rules both XVERSE connector cases depend on.
 */

const message = {
  providerMessageId: 'wamid.1',
  to: '+97142000000',
  from: '971501234567',
  sentAt: '2026-10-01T09:00:00Z',
  type: 'text',
  text: 'Hello',
};

describe('international numbers', () => {
  it('accepts WhatsApp numbers with or without the plus, or with 00', () => {
    expect(toE164('971501234567')).toBe('+971501234567');
    expect(toE164('+92 300 1234567')).toBe('+923001234567');
    expect(toE164('00971501234567')).toBe('+971501234567');
  });

  it('rejects things that are not numbers', () => {
    expect(toE164('')).toBeNull();
    expect(toE164('abc')).toBeNull();
    expect(toE164('12')).toBeNull();
  });
});

describe('canonical inbound messages', () => {
  it('normalises numbers and dates', () => {
    const parsed = inboundSchema.parse(message);
    expect(parsed.from).toBe('+971501234567');
    expect(parsed.sentAt).toBeInstanceOf(Date);
  });

  it('needs text for a text message and media for a media message', () => {
    expect(inboundSchema.safeParse({ ...message, text: '  ' }).success).toBe(false);
    expect(inboundSchema.safeParse({ ...message, type: 'image', text: null }).success).toBe(false);
    expect(
      inboundSchema.safeParse({
        ...message,
        type: 'image',
        text: null,
        media: { url: 'https://example.com/a.jpg', mimeType: 'image/jpeg' },
      }).success,
    ).toBe(true);
  });

  it('accepts a single message, an array, or { messages: [...] }', () => {
    expect(parseBatch(message, 'messages', inboundSchema).items).toHaveLength(1);
    expect(parseBatch([message, message], 'messages', inboundSchema).items).toHaveLength(2);
    expect(parseBatch({ messages: [message] }, 'messages', inboundSchema).items).toHaveLength(1);
  });

  it('rejects a bad message without blocking the rest of the batch', () => {
    const batch = parseBatch(
      { messages: [message, { ...message, from: 'nobody' }] },
      'messages',
      inboundSchema,
    );
    expect(batch.items).toHaveLength(1);
    expect(batch.errors).toHaveLength(1);
    expect(batch.errors[0].index).toBe(1);
  });

  it('reports an empty request', () => {
    expect(parseBatch(null, 'messages', inboundSchema).errors).toHaveLength(1);
  });
});

describe('status updates and acknowledgements', () => {
  it('need a message reference', () => {
    expect(statusSchema.safeParse({ status: 'read', at: '2026-10-01T09:00:00Z' }).success).toBe(
      false,
    );
    expect(
      statusSchema.safeParse({ providerMessageId: 'x', status: 'read', at: '2026-10-01' }).success,
    ).toBe(true);
    expect(ackSchema.safeParse({ id: 'not-an-id', status: 'sent' }).success).toBe(false);
  });

  it('never move a message backwards', () => {
    expect(shouldApplyStatus('sent', 'delivered')).toBe(true);
    expect(shouldApplyStatus('delivered', 'read')).toBe(true);
    expect(shouldApplyStatus('read', 'delivered')).toBe(false);
    expect(shouldApplyStatus('delivered', 'sent')).toBe(false);
    expect(shouldApplyStatus('sent', 'failed')).toBe(true);
    expect(shouldApplyStatus('read', 'failed')).toBe(false);
  });
});

describe('request signing', () => {
  const secret = 'whsec_test';
  const now = Date.UTC(2026, 9, 1, 9, 0, 0);
  const timestamp = String(Math.floor(now / 1000));
  const body = JSON.stringify(message);
  const signature = signPayload(secret, timestamp, body);

  it('accepts a correctly signed request', () => {
    expect(verifySignature({ secret, timestamp, signature, body, now })).toEqual({ ok: true });
  });

  it('accepts the signature without the sha256= prefix', () => {
    const bare = signature.replace('sha256=', '');
    expect(verifySignature({ secret, timestamp, signature: bare, body, now }).ok).toBe(true);
  });

  it('rejects a changed body, a wrong secret or missing headers', () => {
    expect(verifySignature({ secret, timestamp, signature, body: `${body} `, now }).ok).toBe(false);
    expect(verifySignature({ secret: 'other', timestamp, signature, body, now }).ok).toBe(false);
    expect(verifySignature({ secret, timestamp: null, signature, body, now }).ok).toBe(false);
  });

  it('rejects a replay older than five minutes', () => {
    const later = now + 6 * 60 * 1000;
    expect(verifySignature({ secret, timestamp, signature, body, now: later }).ok).toBe(false);
  });
});

describe('outbox delivery', () => {
  it('backs off from 30 seconds and caps at 30 minutes', () => {
    expect(retryDelayMs(1)).toBe(30_000);
    expect(retryDelayMs(2)).toBe(60_000);
    expect(retryDelayMs(3)).toBe(120_000);
    expect(retryDelayMs(20)).toBe(30 * 60 * 1000);
  });

  it('test mode sends, and fails on request', async () => {
    const outbound = {
      id: 'a'.repeat(24),
      channelAccount: 'support' as const,
      to: '+971501234567',
      kind: 'text' as const,
      text: 'Hi',
      template: null,
      media: null,
      context: { ticketId: null, contactId: null },
    };
    const config = { baseUrl: '', apiKey: null };
    expect((await mockProvider.send(outbound, config)).providerMessageId).toMatch(/^mock-/);
    await expect(mockProvider.send({ ...outbound, text: '[fail]' }, config)).rejects.toThrow();
  });

  it('XVERSE push waits for the connector instead of failing messages', async () => {
    await expect(
      providerFor('xverse').send(
        {
          id: 'a'.repeat(24),
          channelAccount: 'crm',
          to: '+971501234567',
          kind: 'text',
          text: 'Hi',
          template: null,
          media: null,
          context: { ticketId: null, contactId: null },
        },
        { baseUrl: '', apiKey: null },
      ),
    ).rejects.toBeInstanceOf(ProviderNotReadyError);
  });
});

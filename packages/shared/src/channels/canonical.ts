import { z } from 'zod';

/**
 * The canonical Channel API (M6, John 1 Oct 2026). Every WhatsApp message, in or out, and every
 * delivery receipt is expressed in these shapes, whichever side ends up holding the XVERSE
 * connector. Only a provider adapter translates to and from XVERSE's own format, so the rest of
 * COEX never changes when that decision is made. See docs/M6-CHANNELS-SPEC.md.
 */

export const CHANNEL_ACCOUNTS = ['support', 'crm'] as const;
export type ChannelAccount = (typeof CHANNEL_ACCOUNTS)[number];

export const MESSAGE_TYPES = [
  'text',
  'image',
  'document',
  'audio',
  'video',
  'location',
  'contact',
] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

export const MEDIA_TYPES: readonly MessageType[] = ['image', 'document', 'audio', 'video'];

export const DELIVERY_STATUSES = ['sent', 'delivered', 'read', 'failed'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

/**
 * WhatsApp always reports full international numbers, sometimes without the plus. Unlike a number
 * typed into a contact form, there is no national form to guess at here, so a bare number is taken
 * as international rather than run through the country picker logic.
 */
export function toE164(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[^\d+]/g, '');
  if (!cleaned) return null;
  const international = cleaned.startsWith('+')
    ? cleaned
    : cleaned.startsWith('00')
      ? `+${cleaned.slice(2)}`
      : `+${cleaned}`;
  return /^\+[1-9]\d{6,14}$/.test(international) ? international : null;
}

const phone = z
  .string()
  .trim()
  .min(5)
  .max(24)
  .transform((value, context) => {
    const number = toE164(value);
    if (!number) {
      context.addIssue({ code: 'custom', message: `"${value}" is not a phone number.` });
      return z.NEVER;
    }
    return number;
  });

const mediaSchema = z.object({
  url: z.string().url().max(2000),
  mimeType: z.string().trim().min(1).max(200),
  fileName: z.string().trim().max(255).nullish(),
  size: z.number().int().nonnegative().nullish(),
});

export const inboundSchema = z
  .object({
    providerMessageId: z.string().trim().min(1).max(200),
    to: phone,
    from: phone,
    profileName: z.string().trim().max(200).nullish(),
    sentAt: z.coerce.date(),
    type: z.enum(MESSAGE_TYPES),
    text: z.string().max(10000).nullish(),
    media: mediaSchema.nullish(),
    replyToProviderMessageId: z.string().trim().max(200).nullish(),
  })
  .refine((message) => message.type !== 'text' || Boolean(message.text?.trim()), {
    message: 'A text message needs text.',
  })
  .refine((message) => !MEDIA_TYPES.includes(message.type) || Boolean(message.media), {
    message: 'A media message needs media.',
  });

export type CanonicalInbound = z.output<typeof inboundSchema>;

export const statusSchema = z
  .object({
    providerMessageId: z.string().trim().min(1).max(200).nullish(),
    outboxId: z
      .string()
      .trim()
      .regex(/^[a-f\d]{24}$/i)
      .nullish(),
    status: z.enum(DELIVERY_STATUSES),
    at: z.coerce.date(),
    error: z.string().max(1000).nullish(),
  })
  .refine((update) => Boolean(update.providerMessageId || update.outboxId), {
    message: 'A status update needs providerMessageId or outboxId.',
  });

export type CanonicalStatus = z.output<typeof statusSchema>;

export const ackSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[a-f\d]{24}$/i),
  status: z.enum(['sent', 'failed']),
  providerMessageId: z.string().trim().min(1).max(200).nullish(),
  error: z.string().max(1000).nullish(),
});

export type CanonicalAck = z.output<typeof ackSchema>;

/** What COEX asks a provider to send, and what XVERSE collects from the outbox in Case B. */
export interface CanonicalOutbound {
  id: string;
  channelAccount: ChannelAccount;
  to: string;
  kind: 'text' | 'template' | 'media';
  text: string | null;
  template: { name: string; language: string; parameters: string[] } | null;
  media: { url: string; mimeType: string; fileName: string | null } | null;
  context: { ticketId: string | null; contactId: string | null };
}

export interface ParsedBatch<T> {
  items: T[];
  /** One entry per rejected item, so one malformed message never blocks the rest of a batch. */
  errors: { index: number; error: string }[];
}

/** Accepts a single object, an array, or `{ <key>: [...] }`, and validates each item on its own. */
export function parseBatch<T>(body: unknown, key: string, schema: z.ZodType<T>): ParsedBatch<T> {
  const list: unknown[] = Array.isArray(body)
    ? body
    : body && typeof body === 'object' && Array.isArray((body as Record<string, unknown>)[key])
      ? ((body as Record<string, unknown>)[key] as unknown[])
      : body && typeof body === 'object'
        ? [body]
        : [];

  const result: ParsedBatch<T> = { items: [], errors: [] };
  if (!list.length) result.errors.push({ index: 0, error: 'The request carried no items.' });
  list.slice(0, 500).forEach((item, index) => {
    const parsed = schema.safeParse(item);
    if (parsed.success) result.items.push(parsed.data);
    else
      result.errors.push({
        index,
        error: parsed.error.issues.map((issue) => issue.message).join(' '),
      });
  });
  return result;
}

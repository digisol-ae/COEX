import type {
  CanonicalInbound,
  CanonicalOutbound,
  CanonicalStatus,
  ParsedBatch,
} from '@coex/shared/channels/canonical';

export interface ProviderConfig {
  baseUrl: string;
  apiKey: string | null;
}

/**
 * What COEX needs from a WhatsApp provider. The rest of COEX only ever sees canonical shapes;
 * an adapter is the one place that knows a provider's own format.
 */
export interface ChannelProvider {
  name: 'mock' | 'xverse';
  parseInbound(body: unknown): ParsedBatch<CanonicalInbound>;
  parseStatus(body: unknown): ParsedBatch<CanonicalStatus>;
  /** Push delivery only (Case A). Throws on failure; the worker retries. */
  send(message: CanonicalOutbound, config: ProviderConfig): Promise<{ providerMessageId: string }>;
}

/** Thrown when a provider cannot send yet; the worker keeps the message pending, unspent. */
export class ProviderNotReadyError extends Error {}

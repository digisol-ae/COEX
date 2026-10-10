import { randomUUID } from 'node:crypto';
import { inboundSchema, parseBatch, statusSchema } from '@coex/shared/channels/canonical';
import { ProviderNotReadyError, type ChannelProvider } from './types';

/**
 * Test mode. Accepts canonical payloads and "sends" by returning an id, so the whole flow can be
 * built and tried before XVERSE is confirmed. A message whose text contains [fail] fails, to
 * exercise retries.
 */
export const mockProvider: ChannelProvider = {
  name: 'mock',
  parseInbound: (body) => parseBatch(body, 'messages', inboundSchema),
  parseStatus: (body) => parseBatch(body, 'statuses', statusSchema),
  async send(message) {
    if (message.text?.includes('[fail]')) throw new Error('Test mode: simulated send failure.');
    return { providerMessageId: `mock-${randomUUID()}` };
  },
};

/**
 * XVERSE. Until its API is confirmed (docs/M6-CHANNELS-SPEC.md section 7), XVERSE is expected to
 * post canonical payloads (Case B). If XVERSE turns out to have its own webhook format and send API
 * (Case A), the mapping goes here and nowhere else.
 */
export const xverseProvider: ChannelProvider = {
  name: 'xverse',
  parseInbound: (body) => parseBatch(body, 'messages', inboundSchema),
  parseStatus: (body) => parseBatch(body, 'statuses', statusSchema),
  async send() {
    throw new ProviderNotReadyError(
      'Sending through the XVERSE API is not connected yet. Use delivery "XVERSE collects" until it is.',
    );
  },
};

export function providerFor(name: string | null | undefined): ChannelProvider {
  return name === 'xverse' ? xverseProvider : mockProvider;
}

export { ProviderNotReadyError };

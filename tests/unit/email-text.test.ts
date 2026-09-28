import { describe, expect, it } from 'vitest';
import { customerEmailText, renderSignature } from '@/modules/tickets/email-text';
import { expandCannedReply } from '@/modules/tickets/canned-reply-text';

const signature = 'Kind regards,\n{{agent}}\n{{agent_title}}\nDigiSol {{queue}}';

describe('signatures', () => {
  it('fills the person replying and the queue', () => {
    expect(
      renderSignature(signature, {
        agentName: 'Sara Ahmed',
        agentTitle: 'Engineer',
        queueName: 'Support',
      }),
    ).toBe('Kind regards,\nSara Ahmed\nEngineer\nDigiSol Support');
  });

  it('leaves out a line whose placeholder is empty, instead of sending it half filled', () => {
    expect(renderSignature(signature, { queueName: 'Support' })).toBe(
      'Kind regards,\nDigiSol Support',
    );
  });

  it('puts the signature between the message and the ticket footer', () => {
    expect(customerEmailText({ body: 'Fixed.', signature: 'Sara', ticketNumber: 'DGS-S-1' })).toBe(
      'Fixed.\n\nSara\n\n--\nTicket DGS-S-1. Please keep [DGS-S-1] in the subject when you reply.',
    );
    expect(
      customerEmailText({
        body: 'Thanks.',
        signature: 'Sara',
        ticketNumber: 'DGS-S-1',
        footer: false,
      }),
    ).toBe('Thanks.\n\nSara');
  });

  it('removes {{signature}} from a saved reply when the queue signs by itself', () => {
    expect(expandCannedReply('Done.\n{{signature}}', { signature: '' })).toBe('Done.\n');
    expect(expandCannedReply('Done.\n{{signature}}', {})).toBe('Done.\n{{signature}}');
  });
});

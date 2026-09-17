import { describe, expect, it } from 'vitest';
import { expandCannedReply } from '@/modules/tickets/canned-reply-text';
import { formatWorkingMinutes } from '@/modules/tickets/business-hours';
import { untilDue } from '@/modules/tickets/labels';

describe('expanding a saved reply', () => {
  const context = {
    contactName: 'Amina Rahman',
    organisationName: 'Dental Studio',
    agentName: 'Syed Ali',
    ticketNumber: 'DGS-S-42',
    ticketSubject: 'Scanner will not connect',
    signature: 'DigiSol Support',
  };

  it('fills every placeholder it knows', () => {
    const filled = expandCannedReply(
      'Dear {{contact}}, about {{ticket}} ({{subject}}) for {{customer}}. {{agent}} {{signature}}',
      context,
    );

    expect(filled).toBe(
      'Dear Amina, about DGS-S-42 (Scanner will not connect) for Dental Studio. Syed Ali DigiSol Support',
    );
  });

  it('uses the first name only, so a reply does not read like a letter from a bank', () => {
    expect(expandCannedReply('Hello {{contact}}', context)).toBe('Hello Amina');
  });

  it('falls back to there when the ticket has no contact', () => {
    expect(expandCannedReply('Hello {{contact}}', { ...context, contactName: null })).toBe(
      'Hello there',
    );
  });

  it('leaves an unfillable placeholder visible rather than blanking it', () => {
    const filled = expandCannedReply('Regards, {{signature}}', { ...context, signature: null });

    // "Regards, " would be sent without anyone noticing. "{{signature}}" gets fixed.
    expect(filled).toBe('Regards, {{signature}}');
  });

  it('leaves a placeholder it has never heard of alone', () => {
    expect(expandCannedReply('Your {{invoice}} is ready', context)).toBe(
      'Your {{invoice}} is ready',
    );
  });

  it('tolerates spacing inside the braces', () => {
    expect(expandCannedReply('Hello {{ contact }}', context)).toBe('Hello Amina');
  });
});

describe('reading a target back', () => {
  it('uses minutes below an hour', () => {
    expect(formatWorkingMinutes(45)).toBe('45m');
  });

  it('uses hours below a working day', () => {
    expect(formatWorkingMinutes(240)).toBe('4h');
  });

  it('uses working days beyond one, not clock days', () => {
    // The default calendar is nine to six, so a working day is 540 minutes rather than 1440.
    expect(formatWorkingMinutes(540)).toBe('1 working day');
    expect(formatWorkingMinutes(1080)).toBe('2 working days');
  });
});

describe('how long until a promise runs out', () => {
  const now = new Date('2026-09-18T10:00:00');

  it('reads forwards while there is time left', () => {
    expect(untilDue(new Date('2026-09-18T12:00:00'), now)).toBe('in 2h');
  });

  it('reads backwards once it has passed', () => {
    expect(untilDue(new Date('2026-09-18T09:30:00'), now)).toBe('30m ago');
  });

  it('switches to days when the number of hours stops meaning anything', () => {
    expect(untilDue(new Date('2026-09-21T10:00:00'), now)).toBe('in 3d');
  });
});

/**
 * Filling a saved reply.
 *
 * Pure text handling, kept apart from the service, because the reply box expands a template in the
 * browser the moment an agent inserts it. Anything that touches the database cannot be imported
 * there, and a placeholder that only fills on the server would mean sending before seeing.
 */

export interface ReplyContext {
  contactName?: string | null;
  organisationName?: string | null;
  agentName?: string | null;
  ticketNumber?: string | null;
  ticketSubject?: string | null;
  signature?: string | null;
}

/** The placeholders a saved reply may use, shown beside the editor so nobody has to guess. */
export const PLACEHOLDERS = [
  { token: '{{contact}}', describes: "the contact's first name, or 'there' when there is none" },
  { token: '{{customer}}', describes: 'the company name' },
  { token: '{{agent}}', describes: 'the person sending the reply' },
  { token: '{{ticket}}', describes: 'the ticket number' },
  { token: '{{subject}}', describes: 'the ticket subject' },
  { token: '{{signature}}', describes: "the queue's signature" },
] as const;

/**
 * An unknown or unfillable placeholder is left exactly as written rather than blanked. A reply
 * that still reads "Dear {{contact}}" in the box is obviously unfinished and gets fixed; one that
 * reads "Dear ," gets sent.
 */
export function expandCannedReply(body: string, context: ReplyContext): string {
  const values: Record<string, string | null | undefined> = {
    contact: context.contactName?.split(' ')[0] ?? 'there',
    customer: context.organisationName,
    agent: context.agentName,
    ticket: context.ticketNumber,
    subject: context.ticketSubject,
    signature: context.signature,
  };

  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, key: string) => {
    const value = values[key];
    return value ? value : whole;
  });
}

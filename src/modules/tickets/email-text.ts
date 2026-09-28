/**
 * The words of a customer email, in one place: the signature and the footer that carries the
 * ticket number (John, 28 Sep 2026: a signature editor and previews of the templates).
 *
 * Pure text, so Setup can preview exactly what the server will send, without a database.
 */

export interface SignatureContext {
  agentName?: string | null;
  agentTitle?: string | null;
  queueName?: string | null;
}

/** The placeholders a signature may use, shown beside the editor. */
export const SIGNATURE_PLACEHOLDERS = [
  { token: '{{agent}}', describes: 'the name of the person replying' },
  { token: '{{agent_title}}', describes: 'their job title, from their profile' },
  { token: '{{queue}}', describes: 'the queue, such as Support' },
] as const;

/**
 * Fills a signature. A line whose placeholder has nothing to fill it is dropped rather than sent
 * half empty: an acknowledgement has no agent, and someone without a job title has no title, and
 * neither should leave a blank or a stray "{{agent_title}}" in front of a customer.
 */
export function renderSignature(signature: string | null | undefined, context: SignatureContext) {
  if (!signature?.trim()) return '';
  const values: Record<string, string | null | undefined> = {
    agent: context.agentName,
    agent_title: context.agentTitle,
    queue: context.queueName,
  };
  return signature
    .split('\n')
    .flatMap((line) => {
      let missing = false;
      const filled = line.replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, key: string) => {
        if (!(key in values)) return whole;
        const value = values[key]?.trim();
        if (!value) missing = true;
        return value ?? '';
      });
      return missing ? [] : [filled.trimEnd()];
    })
    .join('\n')
    .trim();
}

/** Body, then the signature, then the ticket footer: the layout of every email to a customer. */
export function customerEmailText(input: {
  body: string;
  signature?: string | null;
  ticketNumber: string;
  /** The acknowledgement says it in its own words, so it leaves the footer out. */
  footer?: boolean;
}): string {
  return [
    input.body.trim(),
    input.signature?.trim() ? `\n${input.signature.trim()}` : '',
    input.footer === false
      ? ''
      : `\n--\nTicket ${input.ticketNumber}. Please keep [${input.ticketNumber}] in the subject when you reply.`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** The acknowledgement's own placeholders, single-braced as they have always been. */
export function fillAcknowledgement(
  template: string,
  values: { customer: string; ticket: string; subject: string },
): string {
  return template.replace(
    /\{(\w+)\}/g,
    (match, name: string) => (values as Record<string, string>)[name] ?? match,
  );
}

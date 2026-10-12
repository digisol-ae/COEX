'use client';

import { useState } from 'react';
import { Button, Field } from '@/components/ui';
import { EmailPreview, SAMPLE } from '@/components/ui/email-preview';
import {
  SIGNATURE_PLACEHOLDERS,
  customerEmailText,
  renderSignature,
} from '@coex/shared/tickets/email-text';

/**
 * The queue's signature (John, 28 Sep 2026): several lines, placeholders for whoever replies, a
 * live preview beside the editor, and a full email preview.
 */
export function SignatureEditor({
  initial,
  autoSign,
  queueName,
  from,
}: {
  initial: string;
  autoSign: boolean;
  queueName: string;
  from: string;
}) {
  const [signature, setSignature] = useState(initial);
  const [previewing, setPreviewing] = useState(false);

  const sample = renderSignature(signature, {
    agentName: SAMPLE.agent,
    agentTitle: SAMPLE.agentTitle,
    queueName: queueName || 'Support',
  });

  return (
    <fieldset className="space-y-3 rounded-[var(--radius-control)] border border-[var(--color-line)] p-3">
      <legend className="px-1 text-[11px] tracking-wide text-[var(--color-ink-subtle)] uppercase">
        Signature
      </legend>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Signature" hint="Plain text, as many lines as you like.">
          <textarea
            name="signature"
            rows={6}
            value={signature}
            onChange={(event) => setSignature(event.target.value)}
            placeholder={
              'Kind regards,\n{{agent}}\n{{agent_title}}\nDigiSol Support\n+971 4 000 0000'
            }
            className="w-full rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 font-mono text-[13px] text-[var(--color-ink)]"
          />
        </Field>

        <div>
          <p className="mb-1.5 text-sm font-medium text-[var(--color-ink)]">
            As a customer sees it
          </p>
          <div className="min-h-[9.5rem] rounded-[var(--radius-control)] border border-dashed border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-3 py-2 text-[13px] whitespace-pre-line text-[var(--color-ink-muted)]">
            {sample || 'No signature.'}
          </div>
          <p className="mt-1 text-xs text-[var(--color-ink-subtle)]">
            Shown for {SAMPLE.agent}, {SAMPLE.agentTitle}. A line whose placeholder is empty is left
            out, as in an acknowledgement, which has no agent.
          </p>
        </div>
      </div>

      <ul className="grid gap-x-4 gap-y-0.5 text-[12px] text-[var(--color-ink-muted)] sm:grid-cols-3">
        {SIGNATURE_PLACEHOLDERS.map((placeholder) => (
          <li key={placeholder.token}>
            <button
              type="button"
              title="Add to the signature"
              onClick={() =>
                setSignature(
                  (value) =>
                    `${value}${value && !value.endsWith('\n') ? '\n' : ''}${placeholder.token}`,
                )
              }
              className="font-mono text-[11px] text-[var(--color-ink)] underline-offset-2 hover:underline"
            >
              {placeholder.token}
            </button>{' '}
            {placeholder.describes}
          </li>
        ))}
      </ul>

      <label className="flex items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          name="autoSign"
          defaultChecked={autoSign}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          <span className="font-medium text-[var(--color-ink)]">
            Sign every email to a customer automatically
          </span>
          <span className="block text-xs text-[var(--color-ink-subtle)]">
            Replies and the acknowledgement. Off: only saved replies with {'{{signature}}'} add it.
          </span>
        </span>
      </label>

      <div>
        <Button type="button" variant="secondary" onClick={() => setPreviewing(true)}>
          Preview a reply
        </Button>
      </div>

      {previewing ? (
        <EmailPreview
          from={from}
          to={`${SAMPLE.customer} <${SAMPLE.email}>`}
          subject={`Re: [${SAMPLE.ticket}] ${SAMPLE.subject}`}
          text={customerEmailText({
            body: `Hello ${SAMPLE.customer.split(' ')[0]},\n\nThank you for your patience. We have restarted the print spooler and your printer is working again. Please let us know if it happens again.`,
            signature: sample,
            ticketNumber: SAMPLE.ticket,
          })}
          note={SAMPLE.note}
          onClose={() => setPreviewing(false)}
        />
      ) : null}
    </fieldset>
  );
}

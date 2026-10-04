'use client';

import { useState, useTransition } from 'react';
import { Button, Field, Input, Notice, Select } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';
import { useToast } from '@/components/ui/toast';
import { fillContractTemplate, CONTRACT_EMAIL_PLACEHOLDERS } from '@/modules/crm/contract-email';
import type { ContractEmailDraft } from '@/modules/crm/services/contract.service';
import { prepareContractEmailAction, sendContractEmailAction } from './actions';

const TEMPLATE_LABEL = {
  renewal: 'Renewal reminder',
  expired: 'Contract ended',
  general: 'General message',
} as const;

type TemplateKey = keyof typeof TEMPLATE_LABEL;

/**
 * Email the people chosen on a contract, from the Contracts sender. The popup opens on the template
 * that fits where the contract stands, lets the person change the words, and previews exactly what
 * the first recipient will read.
 */
export function ContractEmailButton({
  contractId,
  lastEmailedAt,
}: {
  contractId: string;
  lastEmailedAt: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ContractEmailDraft | null>(null);
  const [template, setTemplate] = useState<TemplateKey>('general');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [sending, startSending] = useTransition();
  const { showToast } = useToast();

  function choose(key: TemplateKey, from: ContractEmailDraft) {
    setTemplate(key);
    setSubject(from.templates[key].subject);
    setBody(from.templates[key].body);
  }

  function openPopup() {
    setOpen(true);
    setError(null);
    startLoading(async () => {
      const result = await prepareContractEmailAction(contractId);
      if (result.error || !result.draft) {
        setError(result.error ?? 'Could not prepare the email.');
        return;
      }
      setDraft(result.draft);
      choose(result.draft.defaultTemplate, result.draft);
    });
  }

  function send() {
    setError(null);
    startSending(async () => {
      const result = await sendContractEmailAction(contractId, subject, body);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      showToast(result.message ?? 'Email queued.');
    });
  }

  const label = lastEmailedAt
    ? `Email contract contacts (last emailed ${lastEmailedAt.slice(0, 10)})`
    : 'Email contract contacts';

  if (!open) return <IconButton icon="message" label={label} onClick={openPopup} />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 popup-backdrop-light">
      <div className="popup-glass-gradient max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5 text-left">
        <h2 className="font-medium">Email contract contacts</h2>

        {loading && !draft ? <p className="mt-3 text-sm">Loading…</p> : null}

        {draft ? (
          <div className="mt-3 space-y-3">
            <div className="text-sm">
              <p className="font-medium text-[var(--color-ink)]">To</p>
              {draft.recipients.length === 0 ? (
                <p className="text-[var(--color-ink-muted)]">
                  Nobody yet. Edit the contract and choose its contract contacts.
                </p>
              ) : (
                <ul className="text-[var(--color-ink-muted)]">
                  {draft.recipients.map((recipient) => (
                    <li key={recipient.id}>
                      {recipient.name}{' '}
                      {recipient.email ? (
                        `<${recipient.email}>`
                      ) : (
                        <span className="text-[var(--color-status-alert)]">
                          (no email address, will be skipped)
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Field label="Template">
              <Select
                value={template}
                onChange={(event) => choose(event.target.value as TemplateKey, draft)}
              >
                {(Object.keys(TEMPLATE_LABEL) as TemplateKey[]).map((key) => (
                  <option key={key} value={key}>
                    {TEMPLATE_LABEL[key]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Subject">
              <Input value={subject} onChange={(event) => setSubject(event.target.value)} />
            </Field>

            <Field
              label="Message"
              hint={`Placeholders: ${CONTRACT_EMAIL_PLACEHOLDERS.map(([token]) => token).join(' ')}`}
            >
              <textarea
                rows={9}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                className="w-full rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm"
              />
            </Field>

            <div className="rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] p-3 text-sm">
              <p className="text-xs text-[var(--color-ink-subtle)]">
                Preview for {draft.previewName}
              </p>
              <p className="mt-1 font-medium text-[var(--color-ink)]">
                {fillContractTemplate(subject, draft.sampleValues)}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[var(--color-ink-muted)]">
                {fillContractTemplate(body, draft.sampleValues)}
              </p>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-3">
            <Notice tone="alert">{error}</Notice>
          </div>
        ) : null}

        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            onClick={send}
            disabled={sending || !draft || draft.recipients.length === 0}
          >
            {sending ? 'Sending' : 'Send email'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { Button, Field, Input, Notice, Select } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';
import { useToast } from '@/components/ui/toast';
import { fillContractTemplate, CONTRACT_EMAIL_PLACEHOLDERS } from '@coex/shared/crm/contract-email';
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
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [sender, setSender] = useState('');
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
    setDraft(null);
    setError(null);
    startLoading(async () => {
      const result = await prepareContractEmailAction(contractId);
      if (result.error || !result.draft) {
        setError(result.error ?? 'Could not prepare the email.');
        return;
      }
      setDraft(result.draft);
      setTo(
        result.draft.recipients
          .filter((r) => r.email)
          .map((r) => r.email)
          .join(', '),
      );
      setCc(result.draft.defaultCc.join(', '));
      setSender(result.draft.defaultSender);
      choose(result.draft.defaultTemplate, result.draft);
    });
  }

  function send() {
    setError(null);
    startSending(async () => {
      const result = await sendContractEmailAction(contractId, subject, body, {
        to: to
          .split(/[;,\n]+/)
          .map((e) => e.trim())
          .filter(Boolean),
        cc: cc
          .split(/[;,\n]+/)
          .map((e) => e.trim())
          .filter(Boolean),
        sender,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      showToast(result.message ?? 'Email queued.');
    });
  }

  const previewEmail = to
    .split(/[;,\n]+/)
    .map((email) => email.trim().toLowerCase())
    .find(Boolean);
  const previewName =
    draft?.addressOptions.find((person) => person.email === previewEmail)?.name ??
    previewEmail ??
    'Customer contact';
  const previewValues = draft ? { ...draft.sampleValues, contact: previewName } : null;
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
            {!draft.senders.length ? (
              <Notice tone="warn">
                Sending is off or no sender is configured. Configure sending identities in Setup →
                Email before sending.
              </Notice>
            ) : null}
            <Field label="From" hint="Add or remove sending identities in Setup → Email.">
              <Select value={sender} onChange={(e) => setSender(e.target.value)}>
                <option value="" disabled>
                  Choose sender
                </option>
                {draft.senders.map((s) => (
                  <option key={s.role} value={s.role}>
                    {s.name} · {s.address}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="To" hint="Add or remove addresses, separated by commas.">
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                list={`contract-addresses-${contractId}`}
              />
            </Field>
            <Field
              label="CC"
              hint={
                draft.defaultCc.length
                  ? 'Ali is included by default. You can add or remove addresses.'
                  : 'Add or remove CC addresses, separated by commas.'
              }
            >
              <Input
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                list={`contract-addresses-${contractId}`}
              />
            </Field>
            <datalist id={`contract-addresses-${contractId}`}>
              {draft.addressOptions.map((a, i) => (
                <option key={`${a.email}-${i}`} value={a.email}>
                  {a.name} · {a.source}
                </option>
              ))}
            </datalist>
            <details className="text-xs text-[var(--color-ink-muted)]">
              <summary className="cursor-pointer">Add team or customer contact</summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {draft.addressOptions.map((a, i) => (
                  <span
                    key={`${a.email}-${i}`}
                    className="rounded border border-[var(--color-line)] px-2 py-1"
                  >
                    {a.name} · {a.email}{' '}
                    <button
                      type="button"
                      className="ml-2 underline"
                      onClick={() => setTo((value) => (value ? `${value}, ${a.email}` : a.email))}
                    >
                      To
                    </button>
                    <button
                      type="button"
                      className="ml-2 underline"
                      onClick={() => setCc((value) => (value ? `${value}, ${a.email}` : a.email))}
                    >
                      CC
                    </button>
                  </span>
                ))}
              </div>
            </details>

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
              <p className="text-xs text-[var(--color-ink-subtle)]">Preview for {previewName}</p>
              <p className="mt-1 font-medium text-[var(--color-ink)]">
                {fillContractTemplate(subject, previewValues!)}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[var(--color-ink-muted)]">
                {fillContractTemplate(body, previewValues!)}
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
            disabled={sending || !draft || !to.trim() || !sender}
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

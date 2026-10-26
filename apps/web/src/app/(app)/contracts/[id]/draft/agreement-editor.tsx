'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input, Select, Notice } from '@/components/ui';
import {
  agreementTokens,
  populateAgreement,
  type AgreementTemplate,
} from '@coex/shared/crm/contract-drafting';
import type { DraftSummary } from '@/modules/crm/services/agreement.service';
import { draftMutation } from '../../templates/actions';

export function AgreementEditor({
  contractId,
  number,
  templates,
  draft,
  automaticValues,
  editable,
}: {
  contractId: string;
  number: string;
  templates: AgreementTemplate[];
  draft: DraftSummary | null;
  automaticValues: Record<string, string>;
  editable: boolean;
}) {
  const [templateId, setTemplateId] = useState(draft?.templateId ?? templates[0]?.id ?? '');
  const [values, setValues] = useState<Record<string, string>>({});
  const [body, setBody] = useState(draft?.body ?? '');
  const [reviewed, setReviewed] = useState(draft?.reviewed ?? false);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState(false);
  const router = useRouter();
  const template = templates.find((t) => t.id === templateId);
  const merged = { ...automaticValues, ...values };
  const generatedPreview = template ? populateAgreement(template.body, merged) : '';
  const unresolved = agreementTokens(body);
  const dirty = body !== (draft?.body ?? '') || reviewed !== (draft?.reviewed ?? false);
  function mutate(operation: 'generate' | 'save') {
    if (
      operation === 'generate' &&
      (draft || body) &&
      !confirm(
        'Replace the existing agreement text with a fresh draft? Your edits will be replaced.',
      )
    )
      return;
    startTransition(async () => {
      const result = await draftMutation({
        contractId,
        operation,
        templateId,
        values,
        body,
        reviewed,
        revision: draft?.revision ?? 0,
      });
      if (result.error) setMessage(result.error);
      else {
        setMessage('Agreement saved.');
        router.refresh();
      }
    });
  }
  function printAgreement() {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0';
    const escaped = body.replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
    );
    frame.srcdoc = `<!doctype html><html><head><title>${number.replace(/[^a-zA-Z0-9-]/g, '')}</title><style>@page{size:A4;margin:20mm}body{font:11pt Arial,sans-serif;line-height:1.55;color:#111}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}header{font-size:10pt;color:#555;margin-bottom:20px}</style></head><body><header>${reviewed ? 'Reviewed agreement' : 'DRAFT — pending review'}</header><pre>${escaped}</pre></body></html>`;
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    };
    document.body.appendChild(frame);
    // A new print replaces the previous frame without interrupting an open print dialog.
    document.querySelectorAll('iframe[data-agreement-print]').forEach((f) => f.remove());
    frame.dataset.agreementPrint = 'true';
  }
  return (
    <div className="space-y-4">
      {editable && (
        <section className="rounded border p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Contract template">
              <Select
                value={templateId}
                onChange={(e) => {
                  setTemplateId(e.target.value);
                  setValues({});
                }}
              >
                <option value="" disabled>
                  Choose a template
                </option>
                {templates.map((t) => (
                  <option value={t.id} key={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Link className="text-sm underline" href="/contracts/templates">
              Manage templates
            </Link>
          </div>
          <p className="text-sm">
            Customer details, contract dates, billing amounts and products are populated from this
            contract. Check or complete the fields below before generating.
          </p>
          {template?.reviewNotes && <Notice tone="warn">{template.reviewNotes}</Notice>}
          <details>
            <summary className="cursor-pointer text-sm font-semibold">
              Populate agreement fields
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {agreementTokens(template?.body ?? '').map((key) => (
                <Field label={key.replaceAll('_', ' ')} key={key}>
                  <Input
                    aria-label={key.replaceAll('_', ' ')}
                    value={merged[key] ?? ''}
                    placeholder="Complete this field"
                    onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                  />
                </Field>
              ))}
            </div>
          </details>
          <div className="flex gap-2">
            <Button disabled={pending || !template} onClick={() => mutate('generate')}>
              {draft ? 'Regenerate agreement' : 'Generate agreement'}
            </Button>
            <Button variant="secondary" disabled={!template} onClick={() => setPreview(!preview)}>
              {preview ? 'Hide template preview' : 'Preview populated template'}
            </Button>
          </div>
          {preview && (
            <pre className="max-h-[500px] overflow-auto whitespace-pre-wrap rounded border bg-white p-5 text-sm text-black">
              {generatedPreview}
            </pre>
          )}
        </section>
      )}
      {draft && (
        <section className="space-y-3">
          <p className="text-sm">
            {draft.templateName} · template revision {draft.templateRevision} · draft revision{' '}
            {draft.revision} · {reviewed ? 'Reviewed' : 'Pending review'}
          </p>
          {draft.reviewNotes && <Notice tone="warn">{draft.reviewNotes}</Notice>}
          {unresolved.length > 0 && (
            <Notice tone="warn">
              Complete remaining fields in the agreement: {unresolved.join(', ')}
            </Notice>
          )}
          <Field label="Customer agreement">
            <textarea
              aria-label="Customer agreement"
              readOnly={!editable}
              className="min-h-[600px] w-full rounded border bg-[var(--color-surface)] p-4 text-sm leading-relaxed"
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setReviewed(false);
              }}
            />
          </Field>
          {editable && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              I have reviewed the wording, scope, dates, charges and completed all fields.
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            {editable && (
              <Button disabled={pending || !dirty} onClick={() => mutate('save')}>
                Save agreement
              </Button>
            )}
            <Button variant="secondary" disabled={dirty || pending} onClick={printAgreement}>
              Print / Save PDF
            </Button>
            <Button
              variant="secondary"
              disabled={dirty || pending}
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([`${reviewed ? '' : 'DRAFT — pending review\n\n'}${body}`], {
                    type: 'text/plain;charset=utf-8',
                  }),
                );
                const a = document.createElement('a');
                a.href = url;
                a.download = `${number}-agreement.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download text
            </Button>
          </div>
          {dirty && <p className="text-sm">Save your changes before printing or downloading.</p>}
          <p className="text-xs">
            Review is an internal check. Signatures and the signed Microsoft 365 document remain
            separate from contract activation.
          </p>
        </section>
      )}
      {!draft && (
        <Notice>
          Choose a template and generate an agreement to start. You can edit the complete text
          before review.
        </Notice>
      )}
      {message && <Notice>{message}</Notice>}
    </div>
  );
}

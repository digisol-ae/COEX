'use client';
import { RecordList } from '@/components/ui/record-window';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input, Select, Notice } from '@/components/ui';
import { agreementTokens, type AgreementTemplate } from '@coex/shared/crm/contract-drafting';
import { templateMutation, archiveTemplateMutation } from './actions';
const blank: AgreementTemplate = {
  id: '',
  name: '',
  type: 'amc',
  body: '',
  reviewNotes: '',
  revision: 0,
  builtin: false,
};
export function TemplateLibrary({
  templates,
  editable,
}: {
  templates: AgreementTemplate[];
  editable: boolean;
}) {
  const [selected, setSelected] = useState(templates[0] ?? blank);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function save(copy: boolean) {
    startTransition(async () => {
      const result = await templateMutation({
        ...selected,
        id: copy || selected.builtin ? undefined : selected.id || undefined,
        name: copy ? `${selected.name} copy` : selected.name,
      });
      if (result.error) setMessage(result.error);
      else {
        setMessage('Template saved. Existing contract drafts keep their text.');
        router.refresh();
        setSelected({
          ...selected,
          name: copy ? `${selected.name} copy` : selected.name,
          id: result.id!,
          builtin: false,
          revision: copy || selected.builtin || !selected.id ? 1 : selected.revision + 1,
        });
      }
    });
  }
  return (
    <div className="grid gap-5 md:grid-cols-[240px_1fr]">
      <div className="space-y-2">
        {editable && (
          <Button
            onClick={() => {
              setSelected(blank);
              setMessage('');
            }}
          >
            New template
          </Button>
        )}
        <RecordList>
          {templates.map((t) => (
            <button
              type="button"
              key={t.id}
              aria-pressed={selected.id === t.id}
              onClick={() => {
                setSelected(t);
                setMessage('');
              }}
              className={`block w-full rounded border p-3 text-left text-sm ${selected.id === t.id ? 'border-current font-semibold' : 'border-transparent'}`}
            >
              {t.name}
              <span className="block text-xs font-normal">
                {t.builtin ? 'Starter · save an edited copy' : `Custom · revision ${t.revision}`}
              </span>
            </button>
          ))}
        </RecordList>
      </div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
      >
        <Field label="Template name">
          <Input
            required
            maxLength={200}
            value={selected.name}
            disabled={!editable}
            onChange={(e) => setSelected({ ...selected, name: e.target.value })}
          />
        </Field>
        <Field label="Contract type">
          <Select
            disabled={!editable}
            value={selected.type}
            onChange={(e) =>
              setSelected({ ...selected, type: e.target.value as AgreementTemplate['type'] })
            }
          >
            <option value="amc">IT / contractual support</option>
            <option value="subscription">Subscription</option>
            <option value="project">Project</option>
          </Select>
        </Field>
        <Field
          label="Agreement text"
          hint="Use {{customer_name}}, {{start_date}}, {{amount}} or your own {{field_name}} placeholders."
        >
          <textarea
            required
            maxLength={150000}
            aria-label="Agreement text"
            className="min-h-[550px] w-full rounded border bg-[var(--color-surface)] p-3 text-sm"
            readOnly={!editable}
            value={selected.body}
            onChange={(e) => setSelected({ ...selected, body: e.target.value })}
          />
        </Field>
        <p className="break-words text-xs">
          Fields: {agreementTokens(selected.body).join(', ') || 'None'}
        </p>
        <Field
          label="Internal review notes"
          hint="Shown to staff when drafting; excluded from printed agreements."
        >
          <textarea
            aria-label="Internal review notes"
            className="w-full rounded border p-3 text-sm"
            readOnly={!editable}
            value={selected.reviewNotes}
            onChange={(e) => setSelected({ ...selected, reviewNotes: e.target.value })}
          />
        </Field>
        {message && <Notice>{message}</Notice>}
        {editable && (
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending} type="submit">
              {selected.builtin ? 'Save as custom template' : 'Save template'}
            </Button>
            {selected.id && (
              <Button
                disabled={pending}
                variant="secondary"
                type="button"
                onClick={() => save(true)}
              >
                Duplicate template
              </Button>
            )}
            {selected.id && !selected.builtin && (
              <Button
                disabled={pending}
                variant="secondary"
                type="button"
                onClick={() => {
                  if (!confirm('Archive this template? Existing drafts will be preserved.')) return;
                  startTransition(async () => {
                    const result = await archiveTemplateMutation(selected.id);
                    if (result.error) setMessage(result.error);
                    else {
                      setSelected(templates[0] ?? blank);
                      router.refresh();
                      setMessage('Template archived.');
                    }
                  });
                }}
              >
                Archive template
              </Button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

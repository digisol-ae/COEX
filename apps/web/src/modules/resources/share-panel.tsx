'use client';
import { useActionState, useState } from 'react';
import { Button, Field, Input, Notice, Select } from '@/components/ui';
import { SettingsDrawer } from '@/components/ui/settings-drawer';
import { useToast } from '@/components/ui/toast';
import {
  shareResourcesAction,
  type ResourceActionState,
} from '@/app/(app)/support/resources/actions';
import type { ResourceView } from './service';
type Recipient = { organisationId: string; email: string; label: string };
export function ShareResourcesPanel({
  initialResources,
  selectedIds,
  ticketId,
  ticketRecipient,
}: {
  initialResources?: ResourceView[];
  selectedIds?: string[];
  ticketId?: string;
  ticketRecipient?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [resources, setResources] = useState(initialResources ?? []);
  const [query, setQuery] = useState('');
  const [resourceSearch, setResourceSearch] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [requestKey, setRequestKey] = useState('');
  const [loadError, setLoadError] = useState('');
  const { showToast } = useToast();
  const [state, formAction, pending] = useActionState(
    async (previous: ResourceActionState, form: FormData) => {
      const result = await shareResourcesAction(previous, form);
      if (result.saved) {
        setOpen(false);
        showToast(
          ticketId
            ? 'Resources emailed and a public ticket reply added.'
            : 'Resources and one-time code queued for email.',
        );
      } else setRequestKey(crypto.randomUUID());
      return result;
    },
    {},
  );
  async function launch() {
    setRequestKey(crypto.randomUUID());
    setSelected(selectedIds ?? []);
    setLoadError('');
    setOpen(true);
    try {
      const response = await fetch('/api/resources?published=1');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const selectedResources = (initialResources ?? []).filter(
        (r) => (selectedIds ?? []).includes(r.id) && r.status === 'published',
      );
      setResources([
        ...selectedResources,
        ...data.resources.filter(
          (r: ResourceView) => !selectedResources.some((s) => s.id === r.id),
        ),
      ]);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load resources.');
    }
  }
  async function searchResources() {
    setLoadError('');
    try {
      const response = await fetch(
        `/api/resources?published=1&search=${encodeURIComponent(resourceSearch)}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const chosen = resources.filter((r) => selected.includes(r.id));
      setResources([
        ...chosen,
        ...data.resources.filter((r: ResourceView) => !chosen.some((s) => s.id === r.id)),
      ]);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load resources.');
    }
  }
  async function searchRecipients() {
    setLoadError('');
    try {
      const response = await fetch(`/api/resources/recipients?search=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRecipients(data.recipients);
      if (!data.recipients.length)
        setLoadError('No matching customer contacts. Try another name or email.');
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not find contacts.');
    }
  }
  return (
    <>
      <Button type="button" variant="secondary" onClick={() => void launch()}>
        Share resources
      </Button>
      <SettingsDrawer title="Share customer resources" open={open} onClose={() => setOpen(false)}>
        {loadError ? <Notice tone="alert">{loadError}</Notice> : null}
        {!ticketId ? (
          <div className="mb-4 space-y-2">
            <label className="block text-sm">
              Find an existing customer or contact
              <Input
                aria-label="Search customer contacts"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Customer name or email"
              />
            </label>
            <Button
              type="button"
              variant="secondary"
              disabled={query.trim().length < 2 || pending}
              onClick={() => void searchRecipients()}
            >
              Find contacts
            </Button>
            {recipients.length ? (
              <Field label="Recipient">
                <Select
                  value={recipient ? `${recipient.organisationId}:${recipient.email}` : ''}
                  onChange={(e) =>
                    setRecipient(
                      recipients.find((r) => `${r.organisationId}:${r.email}` === e.target.value) ??
                        null,
                    )
                  }
                >
                  <option value="">Choose a contact</option>
                  {recipients.map((r) => (
                    <option
                      key={`${r.organisationId}:${r.email}`}
                      value={`${r.organisationId}:${r.email}`}
                    >
                      {r.label}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
          </div>
        ) : (
          <Notice>
            The link and one-time code will be emailed to{' '}
            {ticketRecipient ?? 'the ticket’s customer reply address'}. A public reply containing
            the link will also be added to this ticket. The code is not included in the ticket
            conversation.
          </Notice>
        )}
        <div className="mb-4 flex gap-2">
          <Input
            aria-label="Find published resources"
            placeholder="Find published resources"
            value={resourceSearch}
            onChange={(e) => setResourceSearch(e.target.value)}
          />
          <Button type="button" variant="secondary" onClick={() => void searchResources()}>
            Find resources
          </Button>
        </div>
        <form action={formAction} className="mt-4 space-y-4">
          <input type="hidden" name="requestKey" value={requestKey} />
          <input type="hidden" name="ticketId" value={ticketId ?? ''} />
          <input type="hidden" name="organisationId" value={recipient?.organisationId ?? ''} />
          <input type="hidden" name="recipientEmail" value={recipient?.email ?? ''} />
          <Field label="Email subject">
            <Input
              name="title"
              required
              maxLength={160}
              defaultValue="Tutorials and guides for you"
            />
          </Field>
          <Field label="Message">
            <textarea
              name="message"
              maxLength={4000}
              rows={3}
              className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-2 text-sm"
              placeholder="A short introduction for the customer"
            />
          </Field>
          <Field
            label="Link expires after (hours)"
            hint="Default 72 hours. Choose 1 hour to 365 days. New OTPs never extend this expiry."
          >
            <Input
              name="hours"
              type="number"
              min={1}
              max={8760}
              step="0.5"
              defaultValue={72}
              required
            />
          </Field>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">
              Published resources (select up to 20)
            </legend>
            {resources.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-muted)]">
                No published resources. Publish a document or video in Customer resources first.
              </p>
            ) : null}
            {resources.map((r) => (
              <label
                key={r.id}
                className="flex items-start gap-2 rounded border border-[var(--color-line)] p-2 text-sm"
              >
                <input
                  name="resourceIds"
                  type="checkbox"
                  value={r.id}
                  checked={selected.includes(r.id)}
                  disabled={pending || (!selected.includes(r.id) && selected.length >= 20)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked ? [...selected, r.id] : selected.filter((id) => id !== r.id),
                    )
                  }
                />
                <span>
                  {r.title}
                  <span className="block text-xs text-[var(--color-ink-muted)]">
                    {[r.kind, r.product, r.category].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          <p className="text-xs text-[var(--color-ink-muted)]">
            The customer receives the link and a single-use code in one email. No account is
            required. Verified browsers retain access until expiry or revocation.
          </p>
          {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
          <Button
            type="submit"
            loading={pending}
            disabled={pending || !selected.length || (!ticketId && !recipient)}
          >
            {pending
              ? 'Sharing…'
              : ticketId
                ? 'Email resources and post reply'
                : 'Email resources and code'}
          </Button>
        </form>
      </SettingsDrawer>
    </>
  );
}

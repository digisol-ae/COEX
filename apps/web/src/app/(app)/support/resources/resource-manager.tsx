'use client';
import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input, Notice, Select, Table, Th, Td } from '@/components/ui';
import { SettingsDrawer } from '@/components/ui/settings-drawer';
import type { ResourceView } from '@/modules/resources/service';
import { ShareResourcesPanel } from '@/modules/resources/share-panel';
import { revokeShareAction } from './actions';
function ResourceEditor({ resource }: { resource?: ResourceView }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        {resource ? 'Edit' : 'Add resource'}
      </Button>
      <SettingsDrawer
        title={resource ? 'Edit resource' : 'Add customer resource'}
        open={open}
        onClose={() => setOpen(false)}
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setBusy(true);
            setError('');
            try {
              const response = await fetch('/api/resources', { method: 'POST', body: form });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error);
              setOpen(false);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not save resource.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <input type="hidden" name="id" value={resource?.id ?? ''} />
          <Field label="Title">
            <Input name="title" maxLength={160} required defaultValue={resource?.title} />
          </Field>
          <Field label="Description">
            <textarea
              name="description"
              maxLength={4000}
              rows={3}
              defaultValue={resource?.description}
              className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-2 text-sm"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Product / module">
              <Input name="product" maxLength={100} defaultValue={resource?.product} />
            </Field>
            <Field label="Category">
              <Input name="category" maxLength={100} defaultValue={resource?.category} />
            </Field>
          </div>
          {!resource ? (
            <>
              <Field
                label="Document"
                hint="PDF, Word, Excel, PowerPoint, text or images · up to 20 MB"
              >
                <Input
                  name="file"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp"
                />
              </Field>
              <Field label="Or video link" hint="YouTube, Vimeo or a direct HTTPS MP4/WebM link">
                <Input name="videoUrl" type="url" placeholder="https://…" />
              </Field>
            </>
          ) : (
            <p className="text-sm text-[var(--color-ink-muted)]">
              {resource.fileName ?? resource.videoUrl}. To replace the content, add a new resource
              and archive this one. Existing shares retain their original content.
            </p>
          )}
          <Field
            label="Status"
            hint="Only published resources can be shared. Archiving also removes access from existing shares."
          >
            <Select name="status" defaultValue={resource?.status ?? 'draft'}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
          {error ? <Notice tone="alert">{error}</Notice> : null}
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save resource'}
          </Button>
        </form>
      </SettingsDrawer>
    </>
  );
}
export function ResourceLibrary({
  resources,
  canManage,
  canShare,
}: {
  resources: ResourceView[];
  canManage: boolean;
  canShare: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {canManage ? <ResourceEditor /> : null}
        {canShare ? (
          <ShareResourcesPanel
            initialResources={resources.filter((r) => r.status === 'published')}
            selectedIds={selected}
          />
        ) : null}
      </div>
      {resources.length === 0 ? (
        <Notice>No resources match. Add a document or video link to get started.</Notice>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Select</Th>
              <Th>Resource</Th>
              <Th>Product / category</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {resources.map((r) => (
              <tr key={r.id}>
                <Td>
                  {canShare && r.status === 'published' ? (
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.title}`}
                      checked={selected.includes(r.id)}
                      disabled={!selected.includes(r.id) && selected.length >= 20}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, r.id]
                            : selected.filter((id) => id !== r.id),
                        )
                      }
                    />
                  ) : null}
                </Td>
                <Td>
                  <strong>{r.title}</strong>
                  <span className="block text-xs text-[var(--color-ink-muted)]">
                    {r.kind === 'document'
                      ? `${r.fileName} · ${Math.ceil(r.bytes / 1024)} KB`
                      : 'Video link'}
                  </span>
                  <p className="text-sm">{r.description}</p>
                </Td>
                <Td>{[r.product, r.category].filter(Boolean).join(' · ') || '—'}</Td>
                <Td>{r.status}</Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-3">
                    {r.kind === 'document' ? (
                      <a
                        href={`/api/resources/${r.id}/file`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm underline"
                      >
                        View / download
                      </a>
                    ) : (
                      <a
                        href={r.videoUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm underline"
                      >
                        Open video
                      </a>
                    )}
                    {canManage ? <ResourceEditor resource={r} /> : null}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {resources.length >= 200 ? (
        <Notice>Showing up to 200 matching resources. Refine the search to find more.</Notice>
      ) : null}
    </div>
  );
}
function RevokeButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(revokeShareAction, {});
  return (
    <form action={action}>
      <input name="id" type="hidden" value={id} />
      <Button variant="danger" type="submit" disabled={pending}>
        {pending ? 'Revoking…' : 'Revoke access'}
      </Button>
      {state.error ? (
        <p role="alert" className="text-sm">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
export function ResourceShareHistory({
  shares,
}: {
  shares: {
    id: string;
    title: string;
    recipientEmail: string;
    expiresAt: string;
    revoked: boolean;
    status: string;
    createdAt: string;
    openedAt: string | null;
    downloads: number;
    ticketId: string | null;
  }[];
}) {
  return (
    <div className="space-y-3">
      {shares.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-muted)]">No resources shared yet.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Shared resources</Th>
              <Th>Recipient</Th>
              <Th>Expiry</Th>
              <Th>Activity</Th>
              <Th>Access</Th>
            </tr>
          </thead>
          <tbody>
            {shares.map((s) => (
              <tr key={s.id}>
                <Td>
                  {s.title}
                  <span className="block text-xs text-[var(--color-ink-muted)]">{s.status}</span>
                  {s.ticketId ? (
                    <a href={`/support/tickets/${s.ticketId}`} className="block text-sm underline">
                      Open ticket
                    </a>
                  ) : null}
                </Td>
                <Td>{s.recipientEmail}</Td>
                <Td>{s.expiresAt.replace('T', ' ').slice(0, 16)} UTC</Td>
                <Td>
                  {s.openedAt ? 'Email code verified' : 'Not yet verified'}
                  <span className="block text-xs">{s.downloads} downloads</span>
                </Td>
                <Td>
                  {s.revoked ? (
                    'Revoked'
                  ) : s.status === 'queued' ? (
                    <RevokeButton id={s.id} />
                  ) : (
                    s.status
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <p className="text-xs text-[var(--color-ink-muted)]">
        Latest 100 shares. Verification and downloads do not prove that a document was read or a
        video watched. Revocation immediately stops future access.
      </p>
    </div>
  );
}

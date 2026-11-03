'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Field, Select, Notice } from '@/components/ui';
import type { signatureWorkspace } from '@/modules/crm/services/agreement-signature.service';
import { signatureMutation } from './actions';
import { LetterheadHeader, LetterheadFooter } from '@/modules/crm/letterhead';

export function SignaturePanel({
  contractId,
  workspace,
  editable,
}: {
  contractId: string;
  workspace: Awaited<ReturnType<typeof signatureWorkspace>>;
  editable: boolean;
}) {
  const [contactId, setContact] = useState(workspace.contacts[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  const active = workspace.hasPending;
  const timestamp = (value: string) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: workspace.timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  const signer = workspace.contacts.find((c) => c.id === contactId);
  const mutate = (cancelId?: string) => {
    if (
      !confirm(
        cancelId
          ? 'Cancel this signing link? The customer will no longer be able to sign it.'
          : `Send agreement revision ${workspace.draft?.revision} to ${signer?.name} (${signer?.email}) for signature?`,
      )
    )
      return;
    start(async () => {
      const result = await signatureMutation({
        contractId,
        contactId,
        revision: workspace.draft?.revision,
        cancelId,
      });
      setMessage(
        result.error ??
          (cancelId
            ? 'Signature request cancelled.'
            : 'Signature email queued. Delivery is handled by the email worker.'),
      );
      router.refresh();
    });
  };
  return (
    <div className="space-y-6 [&_button]:min-h-12 [&_select]:min-h-12 [&_select]:text-base">
      {editable && (
        <section className="space-y-4 rounded border p-5">
          <h2 className="font-semibold">Send for signature</h2>
          <p className="text-sm">
            Send a private link valid for 14 days. The customer signs the saved, reviewed agreement
            shown below. Later draft edits do not change that copy.
          </p>
          <Field label="Customer signer">
            <Select
              value={contactId}
              onChange={(e) => setContact(e.target.value)}
              disabled={pending || active}
            >
              <option value="" disabled>
                Choose a customer contact
              </option>
              {workspace.contacts.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name} — {c.email}
                </option>
              ))}
            </Select>
          </Field>
          {!workspace.contacts.length && (
            <Notice>Add an active customer contact with an email address first.</Notice>
          )}
          {!workspace.draft?.reviewed && (
            <Notice>
              Save and review the agreement before sending.{' '}
              <Link className="underline" href={`/contracts/${contractId}/draft`}>
                Open draft agreement
              </Link>
            </Notice>
          )}
          {workspace.letterheadError && (
            <Notice>
              {workspace.letterheadError}{' '}
              <Link className="underline" href="/setup/tenant">
                Tenant settings
              </Link>
            </Notice>
          )}
          {active && (
            <Notice>
              A request is already awaiting signature. Cancel it before sending a replacement.
            </Notice>
          )}
          <Button
            disabled={
              pending ||
              active ||
              !contactId ||
              !workspace.draft?.reviewed ||
              Boolean(workspace.letterheadError)
            }
            onClick={() => mutate()}
          >
            Send for signature
          </Button>
          {workspace.draft && (
            <details>
              <summary className="cursor-pointer text-sm font-medium">
                Review saved agreement · revision {workspace.draft.revision}
              </summary>
              <div className="mt-3 space-y-5 rounded border bg-white p-5 text-[#111111]">
                <LetterheadHeader letterhead={workspace.letterhead} />
                <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {workspace.draft.body}
                </pre>
                <LetterheadFooter letterhead={workspace.letterhead} />
              </div>
            </details>
          )}
        </section>
      )}
      {message && (
        <div role="status">
          <Notice>{message}</Notice>
        </div>
      )}
      <section className="space-y-3">
        <h2 className="font-semibold">Signature history · {workspace.total} requests</h2>
        <p className="text-xs">
          Times shown in {workspace.timezone}. Each send retains its own agreement revision and
          status.{' '}
          <Link className="underline" href="/contracts/signatures">
            View all contract signatures
          </Link>
        </p>
        {!workspace.history.length && <p className="text-sm">No signature requests yet.</p>}
        {workspace.history.map((r) => (
          <article key={r.id} className="space-y-2 rounded border p-4 text-sm">
            <p className="break-all text-xs">Request reference: {r.id}</p>
            <p className="font-semibold">
              {!r.evidenceValid ? 'Evidence check failed · ' : ''}
              {r.status === 'pending'
                ? 'Awaiting signature'
                : r.status === 'signed'
                  ? 'Signed'
                  : r.status === 'expired'
                    ? 'Expired'
                    : 'Cancelled'}{' '}
              · agreement revision {r.revision}
            </p>
            <p className="break-words">
              {r.signerName} · {r.signerEmail}
            </p>
            <p>
              Email:{' '}
              {r.deliveryStatus === 'sent'
                ? 'Sent'
                : r.deliveryStatus === 'failed'
                  ? 'Delivery failed — check Setup, Email'
                  : r.deliveryStatus === 'sending'
                    ? 'Sending'
                    : r.deliveryStatus === 'pending'
                      ? 'Queued'
                      : 'Not queued'}
            </p>
            <p>
              Requested {timestamp(r.createdAt)} by {r.requestedBy} · Link expires{' '}
              {timestamp(r.expiresAt)}
            </p>
            {r.signedAt && (
              <p>
                Signed by {r.signedName} · {timestamp(r.signedAt)}
              </p>
            )}
            {r.sentAt && <p>Email sent {timestamp(r.sentAt)}</p>}
            {r.cancelledAt && r.status === 'cancelled' && (
              <p>Cancelled {timestamp(r.cancelledAt)}</p>
            )}
            {r.needsLetterhead && r.status === 'pending' && (
              <Notice>Cancel this earlier request and send it again on tenant letterhead.</Notice>
            )}
            {r.status === 'signed' && r.evidenceValid && (
              <div className="flex flex-wrap gap-4">
                <a
                  className="inline-flex min-h-12 items-center underline"
                  href={`/contracts/${contractId}/signature/${r.id}/download`}
                >
                  Download signed copy
                </a>
                <a
                  className="inline-flex min-h-12 items-center underline"
                  href={`/contracts/${contractId}/signature/${r.id}/receipt`}
                >
                  Download signing receipt
                </a>
              </div>
            )}
            {editable && r.status === 'pending' && (
              <Button variant="secondary" disabled={pending} onClick={() => mutate(r.id)}>
                Cancel request
              </Button>
            )}
          </article>
        ))}
        <nav className="flex flex-wrap gap-4 text-sm" aria-label="Signature history pages">
          {workspace.page > 1 && (
            <Link className="underline" href={`?page=${workspace.page - 1}`}>
              Newer requests
            </Link>
          )}
          {workspace.page * workspace.pageSize < workspace.total && (
            <Link className="underline" href={`?page=${workspace.page + 1}`}>
              Older requests
            </Link>
          )}
        </nav>
      </section>
    </div>
  );
}

'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Field, Input, Select, Textarea, Notice } from '@/components/ui';
import type { signatureWorkspace } from '@/modules/crm/services/agreement-signature.service';
import { sendSignedCopyAction, signatureMutation } from './actions';
import { SignatureForm } from '@/app/sign/[token]/sign-form';
import { FIRST_PARTY_CONSENT } from '@coex/shared/crm/signature-capture';
import { LetterheadFooter } from '@/modules/crm/letterhead';

function deliveryLabel(status: string | null) {
  switch (status) {
    case 'sent':
      return 'Sent';
    case 'failed':
      return 'Delivery failed — check Setup, Email';
    case 'sending':
      return 'Sending';
    case 'pending':
      return 'Queued';
    default:
      return 'Not queued';
  }
}

export function SignaturePanel({
  contractId,
  workspace,
  editable,
}: {
  contractId: string;
  workspace: Awaited<ReturnType<typeof signatureWorkspace>>;
  editable: boolean;
}) {
  const [providerUserId, setProviderUserId] = useState(workspace.defaultProviderSignerId);
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [contactId, setContact] = useState(workspace.defaultContactId);
  const [emailRequestId, setEmailRequestId] = useState('');
  const emailRequest = workspace.history.find(({ id }) => id === emailRequestId);
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
  const cancel = (cancelId: string) => {
    if (!confirm('Cancel this signing request? Its active link will stop working.')) return;
    start(async () => {
      const result = await signatureMutation({ contractId, cancelId });
      setMessage(result.error ?? 'Signature request cancelled.');
      router.refresh();
    });
  };
  return (
    <div className="space-y-6 [&_button]:min-h-12 [&_select]:min-h-12 [&_select]:text-base">
      {editable && (
        <section className="space-y-4 rounded border p-5">
          <h2 className="font-semibold">Send for signature</h2>
          <p className="text-sm">
            Send a private signing link to the First Party. Once they sign, send a separate link to
            the Second Party. Both sign the saved agreement revision shown below.
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
          <Field label="First Party signer">
            <Select
              value={providerUserId}
              onChange={(e) => setProviderUserId(e.target.value)}
              disabled={pending || active}
            >
              <option value="">Choose a staff member</option>
              {workspace.staffSigners.map((staff) => (
                <option value={staff.id} key={staff.id}>
                  {staff.name} — {staff.email}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            disabled={
              pending ||
              active ||
              !providerUserId ||
              !contactId ||
              !workspace.draft?.reviewed ||
              Boolean(workspace.letterheadError)
            }
            onClick={() =>
              start(async () => {
                const result = await signatureMutation({
                  contractId,
                  contactId,
                  revision: workspace.draft?.revision,
                  providerUserId,
                });
                setMessage(result.error ?? 'First Party invitation queued.');
                router.refresh();
              })
            }
          >
            Send to First Party for signature
          </Button>
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
            onClick={() => setShowProviderForm(true)}
          >
            Add first-party signature
          </Button>
          {workspace.draft && (
            <details>
              <summary className="cursor-pointer text-sm font-medium">
                Review saved agreement · revision {workspace.draft.revision}
              </summary>
              <div className="mt-3 space-y-5 rounded border bg-white p-5 text-[#111111]">
                <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {workspace.draft.body}
                </pre>
                <LetterheadFooter letterhead={workspace.letterhead} agreement />
              </div>
            </details>
          )}
          {showProviderForm && contactId && workspace.draft?.reviewed && !active && (
            <SignatureForm
              title="First Party signature"
              consentText={FIRST_PARTY_CONSENT}
              label="Sign and send to customer"
              submit={async (name, consent, capture) =>
                signatureMutation({
                  contractId,
                  contactId,
                  revision: workspace.draft?.revision,
                  provider: { name, consent, capture },
                })
              }
              onSuccess={() => {
                setShowProviderForm(false);
                setMessage('First Party signed. Customer signature email queued.');
              }}
            />
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
            {r.customerInvited && (
              <p>Second Party invitation · {deliveryLabel(r.deliveryStatus)}</p>
            )}
            <p>
              Requested {timestamp(r.createdAt)} by {r.requestedBy} · Link expires{' '}
              {timestamp(r.expiresAt)}
            </p>
            {r.firstPartyInviteEmail && (
              <p>
                First Party invitation to {r.firstPartyInviteEmail} ·{' '}
                {deliveryLabel(r.firstPartyDeliveryStatus)}
              </p>
            )}
            {!r.customerInvited && r.status === 'pending' && (
              <p>
                {r.firstPartySignedName
                  ? 'Second Party invitation ready to send.'
                  : 'Waiting for the First Party to sign.'}
              </p>
            )}
            {editable && !r.customerInvited && r.firstPartySignedName && r.status === 'pending' && (
              <Button
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const result = await signatureMutation({ contractId, sendSecondPartyId: r.id });
                    setMessage(result.error ?? 'Second Party invitation queued.');
                    router.refresh();
                  })
                }
              >
                Send to Second Party for signature
              </Button>
            )}
            {r.firstPartySignedName && <p>First Party signed by {r.firstPartySignedName}</p>}
            {r.signedAt && (
              <p>
                Signed by {r.signedName} · {timestamp(r.signedAt)}
              </p>
            )}
            {r.sentAt && <p>Invitation sent {timestamp(r.sentAt)}</p>}
            {r.cancelledAt && r.status === 'cancelled' && (
              <p>Cancelled {timestamp(r.cancelledAt)}</p>
            )}
            {r.needsLetterhead && r.status === 'pending' && (
              <Notice>Cancel this earlier request and send it again on tenant letterhead.</Notice>
            )}
            {r.status === 'signed' && (
              <div className="mt-3 space-y-2 border-t pt-3">
                <p className="font-semibold">Contract copy email log</p>
                {r.copyEmails.length === 0 && <p>No contract copy emails yet.</p>}
                <ul className="space-y-2">
                  {r.copyEmails.map((email) => (
                    <li key={email.id} className="break-words">
                      <p className="font-medium">{email.subject}</p>
                      <p>
                        To {email.to}
                        {email.cc.length ? ` · CC ${email.cc.join(', ')}` : ''}
                      </p>
                      <p>
                        {email.status === 'sent'
                          ? 'Sent'
                          : email.status === 'failed'
                            ? 'Failed'
                            : email.status === 'sending'
                              ? 'Sending'
                              : 'Queued'}
                        {' · '}
                        {timestamp(email.sentAt ?? email.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
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
                {editable && (
                  <Button
                    variant="secondary"
                    disabled={pending}
                    onClick={() => setEmailRequestId(r.id)}
                  >
                    Email contract and invoice
                  </Button>
                )}
              </div>
            )}
            {editable && r.status === 'pending' && (
              <Button variant="secondary" disabled={pending} onClick={() => cancel(r.id)}>
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
      {editable && emailRequest && (
        <SignedCopyEmailDialog
          contractId={contractId}
          request={emailRequest}
          companyName={workspace.letterhead?.name}
          senders={workspace.emailSenders}
          onClose={() => setEmailRequestId('')}
          onQueued={() => {
            setEmailRequestId('');
            setMessage('Contract and invoice email queued.');
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function SignedCopyEmailDialog({
  contractId,
  request,
  companyName,
  senders,
  onClose,
  onQueued,
}: {
  contractId: string;
  request: Awaited<ReturnType<typeof signatureWorkspace>>['history'][number];
  companyName?: string;
  senders: Awaited<ReturnType<typeof signatureWorkspace>>['emailSenders'];
  onClose: () => void;
  onQueued: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [sender, setSender] = useState<string>(senders[0]?.role ?? '');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(`Signed contract and invoice — ${request.contractNumber}`);
  const [message, setMessage] = useState(
    `Hello ${request.signerName},\n\nYour signed contract ${request.contractNumber} and invoice are ready. You can access them using the links below.`,
  );
  const [signature, setSignature] = useState(`Kind regards,\n${companyName || 'Contracts Team'}`);
  const [invoiceLink, setInvoiceLink] = useState('');
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="signed-copy-email-title"
      className="popup-glass-gradient m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto p-5 backdrop:bg-black/40"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
    >
      <h2 id="signed-copy-email-title" className="font-semibold">
        Email contract and invoice
      </h2>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          start(async () => {
            const result = await sendSignedCopyAction(contractId, request.id, {
              subject,
              message,
              signature,
              invoiceLink,
              sender,
              cc,
            });
            if (result.queued) onQueued();
            else setError(result.error ?? 'Could not queue email.');
          });
        }}
      >
        {!senders.length && (
          <Notice tone="warn">Configure a sending address in Setup → Email.</Notice>
        )}
        <Field label="From">
          <Select
            required
            value={sender}
            disabled={pending || !senders.length}
            onChange={(e) => setSender(e.target.value)}
          >
            <option value="" disabled>
              Choose sender
            </option>
            {senders.map(({ role, name, address }) => (
              <option key={role} value={role}>
                {name} · {address}
              </option>
            ))}
          </Select>
        </Field>
        <p className="text-sm">To {request.signerEmail}</p>
        <Field label="CC" hint="Separate multiple email addresses with commas.">
          <Input value={cc} disabled={pending} onChange={(e) => setCc(e.target.value)} />
        </Field>
        <Field label="Subject">
          <Input
            required
            value={subject}
            disabled={pending}
            onChange={(e) => setSubject(e.target.value)}
          />
        </Field>
        <Field label="Message">
          <Textarea
            rows={4}
            required
            value={message}
            disabled={pending}
            onChange={(e) => setMessage(e.target.value)}
          />
        </Field>
        <div className="space-y-2 rounded border p-3">
          <p className="text-sm font-semibold">Download links</p>
          <p className="text-sm">
            Download copy of your contract <span className="text-xs">(added by Worktello)</span>
          </p>
          <Field
            label="Zoho Books invoice share link"
            hint="Included as Download copy of your invoice."
          >
            <Input
              type="url"
              required
              value={invoiceLink}
              disabled={pending}
              onChange={(e) => setInvoiceLink(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Email signature">
          <Textarea
            rows={2}
            value={signature}
            disabled={pending}
            onChange={(e) => setSignature(e.target.value)}
          />
        </Field>
        {error && (
          <div role="alert">
            <Notice tone="warn">{error}</Notice>
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={pending}
            disabled={
              pending || !sender || !invoiceLink.trim() || !subject.trim() || !message.trim()
            }
          >
            {pending ? 'Queuing email…' : 'Send email'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

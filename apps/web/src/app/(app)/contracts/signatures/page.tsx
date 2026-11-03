import Link from 'next/link';
import { asUser, requirePermission } from '@/lib/session';
import { listSignatureHistory } from '@/modules/crm/services/agreement-signature.service';
import { PageHeader } from '@/components/ui';

export const metadata = { title: 'Signature tracking · Worktello' };
export default async function SignatureTrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const actor = await requirePermission('contract.read');
  const query = await searchParams;
  const ledger = await asUser(actor, () =>
    listSignatureHistory({ page: Number(query.page ?? 1), status: query.status }),
  );
  const timestamp = (value: string) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: ledger.timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  const labels: Record<string, string> = {
    pending: 'Awaiting signature',
    signed: 'Signed',
    expired: 'Expired',
    cancelled: 'Cancelled',
  };
  const href = (page: number, status = query.status ?? '') =>
    `/contracts/signatures?${new URLSearchParams({ page: String(page), status })}`;
  return (
    <main className="mx-auto max-w-6xl space-y-5">
      <Link href="/contracts" className="text-sm underline">
        Back to contracts
      </Link>
      <PageHeader
        title="Signature tracking"
        description={`Every contract invitation, with its own reference, revision and status. Times shown in ${ledger.timezone}.`}
      />
      <nav
        aria-label="Signature status filters"
        className="flex flex-wrap gap-2 text-sm [&_a]:inline-flex [&_a]:min-h-12 [&_a]:items-center [&_a]:px-2"
      >
        {[['', 'All requests'], ...Object.entries(labels)].map(([status, label]) => (
          <Link
            key={status}
            href={href(1, status)}
            aria-current={(query.status ?? '') === status ? 'page' : undefined}
            className={(query.status ?? '') === status ? 'font-semibold underline' : 'underline'}
          >
            {label}
          </Link>
        ))}
      </nav>
      <p className="text-sm">
        {ledger.total} requests · Times in {ledger.timezone}
      </p>
      <div className="overflow-x-auto rounded border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-3">Contract / customer</th>
              <th className="p-3">Requested / sender</th>
              <th className="p-3">Signer</th>
              <th className="p-3">Status / dates</th>
            </tr>
          </thead>
          <tbody>
            {ledger.history.map((r) => (
              <tr className="border-b align-top" key={r.id}>
                <td className="space-y-2 p-3">
                  <Link
                    className="font-medium underline"
                    href={`/contracts/${r.contractId}/signature`}
                  >
                    {r.contractNumber}
                  </Link>
                  <p>{r.customerName}</p>
                  <p>Revision {r.revision}</p>
                  <p className="break-all text-xs">Ref: {r.id}</p>
                </td>
                <td className="space-y-2 p-3">
                  <p>{timestamp(r.createdAt)}</p>
                  <p>{r.requestedBy}</p>
                </td>
                <td className="space-y-2 p-3">
                  <p>{r.signerName}</p>
                  <p className="break-all">{r.signerEmail}</p>
                </td>
                <td className="space-y-2 p-3">
                  <p className="font-semibold">
                    {r.evidenceValid ? labels[r.status] : 'Evidence check failed'}
                  </p>
                  <p>
                    Email:{' '}
                    {r.deliveryStatus === 'pending'
                      ? 'Queued'
                      : r.deliveryStatus === 'not_queued'
                        ? 'Not queued'
                        : r.deliveryStatus}
                  </p>
                  {r.sentAt && <p>Sent {timestamp(r.sentAt)}</p>}
                  {r.signedAt && (
                    <p>
                      Signed {timestamp(r.signedAt)} by {r.signedName}
                    </p>
                  )}
                  {r.cancelledAt && r.status === 'cancelled' && (
                    <p>Cancelled {timestamp(r.cancelledAt)}</p>
                  )}
                  <p>Link expires {timestamp(r.expiresAt)}</p>
                  {r.status === 'signed' && r.evidenceValid && (
                    <div className="flex flex-wrap gap-4">
                      <a
                        className="inline-flex min-h-12 items-center underline"
                        href={`/contracts/${r.contractId}/signature/${r.id}/download`}
                      >
                        Signed copy
                      </a>
                      <a
                        className="inline-flex min-h-12 items-center underline"
                        href={`/contracts/${r.contractId}/signature/${r.id}/receipt`}
                      >
                        Signing receipt
                      </a>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!ledger.total && <p className="p-5 text-sm">No signature requests match this status.</p>}
      </div>
      <nav aria-label="Signature tracking pages" className="flex gap-4 text-sm">
        {ledger.page > 1 && (
          <Link className="underline" href={href(ledger.page - 1)}>
            Newer requests
          </Link>
        )}
        {ledger.page * ledger.pageSize < ledger.total && (
          <Link className="underline" href={href(ledger.page + 1)}>
            Older requests
          </Link>
        )}
      </nav>
    </main>
  );
}

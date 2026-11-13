import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asUser, requirePermission } from '@/lib/session';
import { myContractSigningRequest } from '@/modules/crm/services/agreement-signature.service';
import { SignatureForm } from '@/app/sign/[token]/sign-form';
import { FIRST_PARTY_CONSENT } from '@coex/shared/crm/signature-capture';
import { signRequest } from '../actions';

export default async function SignRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission('contract.read');
  const { id } = await params;
  const request = await asUser(actor, () => myContractSigningRequest(id));
  if (!request) notFound();
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link className="underline" href="/requests">
        Requests and Approvals
      </Link>
      <h1 className="text-xl font-semibold">
        {request.contractNumber} · {request.customerName}
      </h1>
      <p>
        First Party signer · {request.firstPartyInvitation?.name} · Revision {request.draftRevision}
      </p>
      <article className="whitespace-pre-wrap rounded border p-5">{request.body}</article>
      <SignatureForm
        title="First Party signature"
        consentText={FIRST_PARTY_CONSENT}
        submit={async (_name, consent, capture) => {
          'use server';
          return signRequest(id, consent, capture);
        }}
      />
    </div>
  );
}

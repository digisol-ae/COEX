import { displayDate, displayTimestamp } from '@coex/shared/crm/display-date';
import { pendingProviderInvitation } from '@/modules/crm/services/agreement-signature.service';
import { FIRST_PARTY_CONSENT } from '@coex/shared/crm/signature-capture';
/* eslint-disable @next/next/no-img-element -- Private signature image is decrypted only after email verification. */
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import {
  publicSignatureRequest,
  signingCookieName,
  hasSigningAccess,
  signingPageDetails,
} from '@/modules/crm/services/agreement-signature.service';
import { SignForm } from './sign-form';
import { LetterheadFooter } from '@/modules/crm/letterhead';
import { SigningVerification } from './verification-form';
import { agreementCoverText } from '@/modules/crm/agreement-cover';
import { signatureImage } from '@/modules/crm/signature-evidence';
import { SIGNATURE_STYLES } from '@coex/shared/crm/signature-capture';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Sign agreement · Worktello',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function SigningPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const request = await publicSignatureRequest(token);
  if (!request)
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-semibold">Signing link unavailable</h1>
        <p className="mt-4">
          This link has expired or been cancelled. Please contact the sender for a new link.
        </p>
      </main>
    );
  const provider = pendingProviderInvitation(request);
  const accessToken = (await cookies()).get(signingCookieName(request._id))?.value;
  if (!hasSigningAccess(request, accessToken)) {
    const [local, domain] = (provider?.email ?? request.signerEmail).split('@');
    return (
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <SigningVerification token={token} maskedEmail={`${local.slice(0, 1)}***@${domain}`} />
      </main>
    );
  }
  const details = await signingPageDetails(request);
  const product = details?.productNames?.join(', ') || details?.title;
  const { period } = agreementCoverText(details);
  const image = request.status === 'signed' ? signatureImage(request) : null;
  const style = SIGNATURE_STYLES[request.signatureStyle ?? 0] ?? SIGNATURE_STYLES[0];
  return (
    <main className="mx-auto max-w-4xl space-y-6 bg-white px-5 py-10 text-[#111111]">
      <header>
        <p className="text-sm">{provider ? 'First Party agreement' : 'Customer agreement'}</p>
        <h1 className="mt-2 text-2xl font-semibold">
          {request.contractNumber} · {request.customerName}
        </h1>
        {details && (
          <dl className="mt-3 space-y-1 break-words text-sm">
            <div>
              <dt className="inline font-semibold">Product</dt>{' '}
              <dd className="inline">{product}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Period</dt> <dd className="inline">{period}</dd>
            </div>
          </dl>
        )}
        <p className="mt-3 text-sm">
          For {provider?.name ?? request.signerName} ({provider?.email ?? request.signerEmail}).{' '}
          {request.status === 'signed'
            ? 'This agreement has been signed.'
            : 'Review the complete agreement below before signing.'}
        </p>
      </header>
      <article className="whitespace-pre-wrap break-words text-sm leading-relaxed">
        {request.body}
      </article>
      {request.firstParty && (
        <p className="text-sm">
          First Party signed by {request.firstParty.name}.{' '}
          {request.status === 'pending' && !provider && (
            <> You are signing for {request.customerName} as the Second Party.</>
          )}
        </p>
      )}
      {request.status === 'signed' ? (
        <section className="space-y-3 border-t pt-5">
          <h2 className="text-lg font-semibold">Electronic signature record</h2>
          {image ? (
            <img
              src={image}
              alt="Customer signature"
              className="max-h-40 max-w-full object-contain"
            />
          ) : (
            <p
              className="break-words text-3xl"
              style={{ fontFamily: style.font, fontStyle: style.italic ? 'italic' : 'normal' }}
            >
              {request.signedName}
            </p>
          )}
          <p>
            Signed by {request.signedName} on{' '}
            {request.signedAt && displayTimestamp(request.signedAt)} (UTC).
          </p>
          <p className="text-sm">{request.consentText}</p>
          {request.signerVerifiedAt && (
            <p className="text-xs">
              Invited email verified {displayTimestamp(request.signerVerifiedAt)} (UTC) · Signature
              method: {request.signatureMethod ?? 'typed'}
            </p>
          )}
          <p className="break-all text-xs">
            Request: {String(request._id)} · Revision: {request.draftRevision}
            <br />
            Agreement SHA-256: {request.bodyHash}
            {request.documentHash && (
              <>
                <br />
                Document with letterhead SHA-256: {request.documentHash}
              </>
            )}
          </p>
          <a
            className="inline-flex min-h-12 items-center underline print:hidden"
            href={`/sign/${token}/download`}
          >
            Download signed copy
          </a>
        </section>
      ) : provider && request.firstParty ? (
        <p role="status">
          First Party signature recorded. Staff can now send the agreement to the Second Party.
        </p>
      ) : (
        <SignForm
          token={token}
          consentText={provider ? FIRST_PARTY_CONSENT : request.consentText}
        />
      )}
      {request.letterhead && <LetterheadFooter letterhead={request.letterhead} agreement />}
      <p className="text-xs print:hidden">
        This private link expires on {displayDate(request.expiresAt.toISOString().slice(0, 10))}.
        Keep a copy of your signed agreement.
      </p>
    </main>
  );
}

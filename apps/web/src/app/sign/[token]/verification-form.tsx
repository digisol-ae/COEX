'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Notice } from '@/components/ui';
import { requestSigningCodeAction, verifySigningCodeAction } from './actions';

export function SigningVerification({
  token,
  maskedEmail,
}: {
  token: string;
  maskedEmail: string;
}) {
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <section className="mx-auto max-w-lg space-y-5 rounded border bg-white p-5 text-[#111111]">
      <h1 className="text-xl font-semibold">Verify your email</h1>
      <p className="text-sm leading-relaxed">
        Before viewing or signing this agreement, request a verification code at {maskedEmail}. Only
        the invited signer should continue.
      </p>
      <Button
        type="button"
        className="min-h-12 w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await requestSigningCodeAction(token);
            setMessage(
              result.error ??
                'Verification code queued for email delivery. It expires in 10 minutes.',
            );
            if (!result.error) setSent(true);
          })
        }
      >
        {sent ? 'Request another code' : 'Email me a verification code'}
      </Button>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const result = await verifySigningCodeAction(token, code);
            if (result.error) setMessage(result.error);
            else {
              setMessage('Email verified. Opening agreement…');
              router.refresh();
            }
          });
        }}
      >
        <label className="block space-y-2 text-sm font-medium">
          Six-digit verification code
          <input
            className="min-h-12 w-full rounded border bg-white px-3 text-lg tracking-widest"
            aria-label="Six-digit verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
        </label>
        <Button className="min-h-12 w-full" disabled={pending || code.length !== 6}>
          {pending ? 'Verifying…' : 'Verify and view agreement'}
        </Button>
      </form>
      {message && <Notice>{message}</Notice>}
      <p className="text-xs leading-relaxed">
        Email verification grants access for 30 minutes on this device. It verifies access to the
        invited mailbox; it does not independently verify legal identity or signing authority.{' '}
        <a className="underline" href="/privacy" target="_blank" rel="noopener noreferrer">
          Privacy notice
        </a>
      </p>
    </section>
  );
}

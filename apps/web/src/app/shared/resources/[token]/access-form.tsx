'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input, Notice } from '@/components/ui';
export function ResourceAccessForm({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function submit(action: 'verify' | 'resend', code?: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/shared/resources/${token}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, code }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not verify access.');
      if (result.verified) router.refresh();
      else
        setMessage(
          'A new code has been emailed to the original recipient. It does not extend the link expiry.',
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit('verify', String(new FormData(e.currentTarget).get('code') ?? ''));
        }}
        className="space-y-4"
      >
        <Field
          label="One-time code"
          hint="Enter the 8-digit code included with the link in your email."
        >
          <Input
            name="code"
            inputMode="numeric"
            pattern="[0-9]{8}"
            maxLength={8}
            autoComplete="one-time-code"
            required
            disabled={busy}
          />
        </Field>
        <Button type="submit" disabled={busy}>
          {busy ? 'Please wait…' : 'View resources'}
        </Button>
      </form>
      <p className="text-sm text-[var(--color-ink-muted)]">
        Already used the code in another browser? Request a fresh code for this browser.
      </p>
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={() => void submit('resend')}
      >
        Email a new code
      </Button>
      {error ? <Notice tone="alert">{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
    </div>
  );
}

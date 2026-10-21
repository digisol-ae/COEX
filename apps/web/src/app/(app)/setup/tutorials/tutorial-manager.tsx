'use client';
import { useState } from 'react';
import { Button, Card, CardSection, Field, Input, Notice } from '@/components/ui';

type Tutorial = {
  embed?: boolean;
  sourceUrl?: string | null;
  title: string;
  revision: string;
  url: string;
  active: boolean;
  seen: boolean;
};
export function TutorialManager({ initialTutorial }: { initialTutorial: Tutorial | null }) {
  const [tutorial, setTutorial] = useState<Tutorial | null>(initialTutorial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function refresh() {
    const response = await fetch('/api/tutorials?admin=1', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load tutorials.');
    setTutorial((await response.json()).tutorial);
  }
  async function save(body: FormData | string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/tutorials', {
        method: 'POST',
        body,
        ...(typeof body === 'string' ? { headers: { 'Content-Type': 'application/json' } } : {}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await refresh();
      setMessage(
        typeof body === 'string'
          ? 'Tutorial settings saved.'
          : 'Video uploaded as a draft. Preview it before publishing.',
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save tutorial.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <Card className="!bg-transparent !shadow-none">
        <CardSection title="Upload video">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void save(new FormData(event.currentTarget));
            }}
            className="space-y-3"
          >
            <Field label="Title">
              <Input
                name="title"
                required
                maxLength={100}
                placeholder="Tickets: a quick tour"
                disabled={busy}
              />
            </Field>
            <Field
              label="Video"
              hint="MP4 or WebM · up to 30 MB. For best results, use a brief video with captions."
            >
              <Input
                name="video"
                type="file"
                accept="video/mp4,video/webm"
                required
                disabled={busy}
              />
            </Field>
            <Button type="submit" disabled={busy}>
              {busy ? 'Uploading' : 'Upload draft'}
            </Button>
            {tutorial ? (
              <p className="text-xs text-[var(--color-ink-muted)]">
                Uploading a replacement stops the current tutorial until you publish again.
              </p>
            ) : null}
          </form>
        </CardSection>
      </Card>
      <Card className="!bg-transparent !shadow-none">
        <CardSection title="Video link">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void save(
                JSON.stringify({ action: 'link', title: form.get('title'), url: form.get('url') }),
              );
            }}
          >
            <Field label="Title">
              <Input name="title" required maxLength={100} disabled={busy} />
            </Field>
            <Field
              label="Video link"
              hint="YouTube, Vimeo, or a direct HTTPS MP4/WebM link. The video must allow embedding."
            >
              <Input
                name="url"
                type="url"
                required
                disabled={busy}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </Field>
            <Button type="submit" disabled={busy}>
              Save link as draft
            </Button>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Saving a replacement stops the current tutorial until you publish again.
            </p>
          </form>
        </CardSection>
      </Card>
      {tutorial ? (
        <Card className="!bg-transparent !shadow-none">
          <CardSection title={tutorial.title}>
            <p className="mb-3 text-sm text-[var(--color-ink-muted)]">
              {tutorial.active
                ? 'Published · visible to all users in this workspace'
                : 'Draft · only administrators can preview'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent('coex:tutorial-preview', { detail: tutorial }),
                  )
                }
              >
                Preview
              </Button>
              <Button
                disabled={busy}
                onClick={() => void save(JSON.stringify({ action: 'publish' }))}
              >
                {tutorial.active ? 'Show again to all users' : 'Show to all users'}
              </Button>
              {tutorial.active ? (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void save(JSON.stringify({ action: 'stop' }))}
                >
                  Stop showing
                </Button>
              ) : null}
            </div>
            <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
              Shows once per user for each publication, on their next visit or within 30 seconds
              while COEX is open. Users can close, minimize and watch again. Playback starts when
              they press Play.
            </p>
          </CardSection>
        </Card>
      ) : (
        <p className="text-sm text-[var(--color-ink-muted)]">No tutorial added yet.</p>
      )}
      {error ? <Notice tone="alert">{error}</Notice> : null}
      {message ? <Notice tone="ok">{message}</Notice> : null}
    </div>
  );
}

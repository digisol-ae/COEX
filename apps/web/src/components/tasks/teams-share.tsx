'use client';
import { useEffect, useRef, useState } from 'react';
import {
  taskShareMessage,
  taskTeamsSource,
  teamsMessageLink,
} from '@coex/shared/tasks/teams-sharing';

type ShareWindow = Window & {
  shareToMicrosoftTeams?: {
    renderButtons: (options: { elements: HTMLElement[] }) => Promise<void>;
  };
};
let launcher: Promise<void> | undefined;
function loadLauncher() {
  if (!launcher)
    launcher = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://teams.microsoft.com/share/launcher.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        script.remove();
        launcher = undefined;
        reject(new Error('Teams sharing could not load. Copy the task link instead.'));
      };
      document.head.appendChild(script);
    });
  return launcher;
}
const control =
  'rounded-lg border border-[var(--color-line-strong)] px-3 py-2 text-sm disabled:opacity-50';

export function TeamsShare({
  task,
  description,
  source,
  inTeams = false,
}: {
  task: { id: string; number: string; title: string; status: string };
  description?: string | null;
  source?: string | null;
  inTeams?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('');
  const [prepareWeb, setPrepareWeb] = useState(false);
  const target = useRef<HTMLDivElement>(null);
  const sourceUrl = taskTeamsSource(source, description);
  const [message, setMessage] = useState('');
  const local = url && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname);
  useEffect(() => {
    if (!prepareWeb || !target.current) return;
    const element = target.current;
    let cancelled = false;
    void loadLauncher()
      .then(async () => {
        if (cancelled) return;
        const api = (window as ShareWindow).shareToMicrosoftTeams;
        if (!api) throw new Error('Teams sharing is unavailable. Copy the task link instead.');
        await api.renderButtons({ elements: [element] });
        if (!cancelled)
          setStatus('Choose the Teams button, then select a chat and review before sharing.');
      })
      .catch((cause) => {
        if (!cancelled)
          setStatus(cause instanceof Error ? cause.message : 'Copy the task link instead.');
      });
    return () => {
      cancelled = true;
    };
  }, [prepareWeb]);
  async function continueSharing() {
    if (busy) return;
    setStatus('Opening Teams sharing…');
    if (!inTeams) {
      setPrepareWeb(true);
      return;
    }
    setBusy(true);
    try {
      const teams = await import('@microsoft/teams-js');
      if (!teams.sharing.isSupported()) throw new Error();
      await teams.sharing.shareWebContent({
        content: [{ type: 'URL', url, message, preview: false }],
      });
      setStatus('Teams sharing closed. Check the selected chat to confirm delivery.');
    } catch {
      setStatus(
        'Sharing was cancelled or is unavailable here. Copy the task link and paste it into Teams.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="my-3 space-y-2" aria-label="Teams collaboration">
      <div className="flex flex-wrap gap-2">
        {sourceUrl && (
          <a
            className={control}
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
          >
            {teamsMessageLink(source) ? 'Open source Teams chat ↗' : 'Open linked Teams chat ↗'}
          </a>
        )}
        <button
          className={control}
          onClick={() => {
            setUrl(new URL(`/tasks/${task.id}`, window.location.origin).href);
            setMessage(taskShareMessage(task));
            setOpen(!open);
            setPrepareWeb(false);
            setStatus('');
          }}
        >
          Share task to Teams
        </button>
      </div>
      {open && (
        <div className="space-y-3 rounded-lg border border-[var(--color-line-strong)] p-3">
          <h3 className="font-semibold">Review task share</h3>
          <p className="whitespace-pre-wrap break-words">{message}</p>
          <p className="break-all text-sm">{url}</p>
          <p className="text-sm">
            Only this summary and link are shared. Recipients still need Worktello access. Choose
            the chat and confirm sharing in Teams.
          </p>
          {local && (
            <p className="text-sm" role="note">
              This is a local preview link. Other people cannot open it; use the deployed task link
              when sharing.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              className={control}
              disabled={!!local || prepareWeb || busy}
              onClick={() => void continueSharing()}
            >
              Continue in Teams
            </button>
            <button
              className={control}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`${message}\n${url}`);
                  setStatus('Task summary and link copied.');
                } catch {
                  setStatus('Copy the summary and link above manually.');
                }
              }}
            >
              Copy summary and link
            </button>
            <button
              className={control}
              onClick={() => {
                setOpen(false);
                setPrepareWeb(false);
              }}
            >
              Cancel
            </button>
          </div>
          {prepareWeb && (
            <div ref={target} data-href={url} data-msg-text={message} data-preview="false" />
          )}
          {status && (
            <p role="status" className="text-sm">
              {status}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

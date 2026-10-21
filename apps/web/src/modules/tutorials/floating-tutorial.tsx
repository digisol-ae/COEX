'use client';

import { useEffect, useRef, useState } from 'react';
import { IconButton } from '@/components/ui/icon-button';

type Tutorial = {
  embed?: boolean;
  sourceUrl?: string | null;
  title: string;
  revision: string;
  url: string;
  active: boolean;
  seen: boolean;
};
export function FloatingTutorial({ previewOnly = false }: { previewOnly?: boolean } = {}) {
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [mode, setMode] = useState<'open' | 'minimized' | 'closed'>('closed');
  const [expanded, setExpanded] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [error, setError] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const playbackAt = useRef(0);
  const revision = useRef('');
  const preview = useRef(false);
  const video = useRef<HTMLVideoElement>(null);
  const windowRef = useRef<HTMLElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  useEffect(() => {
    let disposed = false;
    async function poll() {
      try {
        const response = await fetch('/api/tutorials', { cache: 'no-store' });
        if (!response.ok) return;
        const { tutorial: next } = await response.json();
        if (disposed || preview.current) return;
        setTutorial(next);
        if (!next) {
          revision.current = '';
          setMode('closed');
          return;
        }
        if (revision.current !== next.revision) {
          playbackAt.current = 0;
          revision.current = next.revision;
          setError(false);
          setPosition(null);
          setMode(next.seen ? 'closed' : 'open');
          if (!next.seen)
            void fetch('/api/tutorials', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'seen', revision: next.revision }),
            });
        }
      } catch {
        /* A temporary disconnect must not interrupt the person's work. */
      }
    }
    function showPreview(event: Event) {
      if (!previewOnly && document.querySelector('.setup-workspace[open]')) return;
      playbackAt.current = 0;
      preview.current = true;
      setIsPreview(true);
      setTutorial((event as CustomEvent<Tutorial>).detail);
      setError(false);
      setMode('open');
      setPosition(null);
    }
    if (!previewOnly) void poll();
    const interval = previewOnly ? undefined : window.setInterval(poll, 30_000);
    window.addEventListener('coex:tutorial-preview', showPreview);
    return () => {
      disposed = true;
      clearInterval(interval);
      window.removeEventListener('coex:tutorial-preview', showPreview);
    };
  }, [previewOnly]);
  useEffect(() => {
    function resetPosition() {
      setPosition(null);
    }
    window.addEventListener('resize', resetPosition);
    return () => window.removeEventListener('resize', resetPosition);
  }, []);

  function hide(next: 'minimized' | 'closed') {
    playbackAt.current = next === 'minimized' ? (video.current?.currentTime ?? 0) : 0;
    video.current?.pause();
    setMode(next);
    setExpanded(false);
    if (preview.current && next === 'closed') {
      preview.current = false;
      setIsPreview(false);
      revision.current = '';
      setTutorial(null);
    }
  }
  if (!tutorial) return null;
  if (mode !== 'open')
    return (
      <button
        type="button"
        onClick={() => {
          setMode('open');
          setError(false);
        }}
        className="fixed bottom-20 left-4 z-40 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-xs font-medium text-[var(--color-ink)] shadow-lg"
        aria-label={`Watch tutorial: ${tutorial.title}`}
      >
        Tutorial · Watch again
      </button>
    );
  return (
    <aside
      ref={windowRef}
      aria-label="Tutorial player"
      className={`fixed z-40 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] text-[var(--color-ink)] shadow-xl ${expanded ? 'inset-x-3 bottom-20 mx-auto max-w-3xl' : 'w-[min(360px,calc(100vw-24px))]'}`}
      style={
        !expanded
          ? position
            ? { left: position.x, top: position.y }
            : { left: 12, bottom: 80 }
          : undefined
      }
    >
      <div className="flex items-center gap-1 border-b border-[var(--color-line)] px-2 py-1">
        <div
          className="min-w-0 flex-1 touch-none cursor-move select-none text-xs font-semibold"
          title="Drag to move tutorial"
          onPointerDown={(event) => {
            if (expanded || event.button !== 0) return;
            const rect = windowRef.current!.getBoundingClientRect();
            drag.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            const rect = windowRef.current!.getBoundingClientRect();
            setPosition({
              x: Math.max(
                8,
                Math.min(
                  window.innerWidth - rect.width - 8,
                  drag.current.left + event.clientX - drag.current.x,
                ),
              ),
              y: Math.max(
                8,
                Math.min(
                  window.innerHeight - rect.height - 8,
                  drag.current.top + event.clientY - drag.current.y,
                ),
              ),
            });
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          <p className="truncate">
            {isPreview ? 'Preview · ' : ''}
            {tutorial.title}
          </p>
        </div>
        <IconButton
          icon={expanded ? 'restore' : 'expand'}
          label={expanded ? 'Restore tutorial size' : 'Expand tutorial'}
          onClick={() => setExpanded((value) => !value)}
        />
        <IconButton icon="remove" label="Minimize tutorial" onClick={() => hide('minimized')} />
        <IconButton icon="close" label="Close" onClick={() => hide('closed')} />
      </div>
      {tutorial.embed ? (
        <iframe
          key={`${tutorial.revision}-${replayKey}`}
          src={tutorial.url}
          title={tutorial.title}
          allow="fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="aspect-video max-h-[65vh] w-full border-0"
        />
      ) : (
        <video
          key={tutorial.revision}
          ref={video}
          src={tutorial.url}
          controls
          playsInline
          preload="metadata"
          onLoadedMetadata={() => {
            if (video.current && playbackAt.current) video.current.currentTime = playbackAt.current;
          }}
          onError={() => setError(true)}
          className="aspect-video max-h-[65vh] w-full bg-[var(--color-surface-sunken)]"
        />
      )}
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-[var(--color-ink-muted)]">
        <span>
          {error ? 'Video unavailable. Try reopening the tutorial.' : 'Press Play to watch'}
        </span>
        <button
          type="button"
          onClick={() => {
            if (tutorial.embed) {
              setReplayKey((key) => key + 1);
              return;
            }
            if (video.current) {
              video.current.currentTime = 0;
              void video.current.play().catch(() => setError(true));
            }
          }}
          className="font-medium underline underline-offset-2"
        >
          Replay
        </button>
      </div>
    </aside>
  );
}

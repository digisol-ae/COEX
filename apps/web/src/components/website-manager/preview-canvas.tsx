'use client';
import { useEffect, useState } from 'react';
import { LandingPage } from '@/components/landing/landing-page';
import { websiteSchema, type WebsiteContent } from '@/components/landing/website-schema';
export function PreviewCanvas({
  initial,
  trialDays,
  storageLimitBytes,
}: {
  initial?: WebsiteContent;
  trialDays: number;
  storageLimitBytes: number;
}) {
  const [content, setContent] = useState(initial),
    [editing, setEditing] = useState(false);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.source !== window.parent ||
        event.origin !== window.location.origin ||
        window.parent === window
      )
        return;
      if (event.data?.type !== 'worktello-website-preview') return;
      const parsed = websiteSchema.safeParse(event.data.content);
      if (!parsed.success) return;
      setContent(parsed.data);
      setEditing(true);
      const id = typeof event.data.section === 'string' ? event.data.section : '';
      requestAnimationFrame(() =>
        document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' }),
      );
    };
    window.addEventListener('message', receive);
    window.parent.postMessage({ type: 'worktello-website-preview-ready' }, window.location.origin);
    return () => window.removeEventListener('message', receive);
  }, []);
  return (
    <div
      onClickCapture={(event) => {
        if (editing && (event.target as Element).closest('a')) event.preventDefault();
      }}
    >
      <style>{`[data-website-copy]:hover{outline:1px dashed #d63c55;outline-offset:2px;background:#d63c5508}`}</style>
      <LandingPage
        content={content}
        trialDays={trialDays}
        storageLimitBytes={storageLimitBytes}
        onSelectText={
          editing
            ? (key) =>
                window.parent.postMessage(
                  { type: 'worktello-website-select', key },
                  window.location.origin,
                )
            : undefined
        }
      />
    </div>
  );
}

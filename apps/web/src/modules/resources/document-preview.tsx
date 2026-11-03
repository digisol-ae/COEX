'use client';

import { useId, useRef, useState } from 'react';
import { previewable } from './rules';
import { ResourcePdfPreview } from './pdf-preview';

/** Keep protected previews in the shared-resource page and downloads as a separate action. */
export function ResourceDocumentPreview({
  url,
  title,
  fileName,
  contentType,
  autoOpen = false,
}: {
  url: string;
  title: string;
  fileName: string;
  contentType: string;
  autoOpen?: boolean;
}) {
  const canPreview = previewable(contentType);
  const [open, setOpen] = useState(autoOpen && canPreview);
  const previewId = useId();
  const preview = useRef<HTMLDivElement>(null);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {canPreview ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={previewId}
            className="underline"
            onClick={() => {
              setOpen(true);
              preview.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }}
          >
            View document
          </button>
        ) : null}
        <a href={`${url}?download=1`} className="break-all underline">
          Download {fileName}
        </a>
      </div>
      <div id={previewId} ref={preview}>
        {open ? (
          contentType === 'application/pdf' ? (
            <ResourcePdfPreview url={url} title={title} autoOpen />
          ) : (
            <iframe
              src={url}
              title={`${title} document preview`}
              referrerPolicy="no-referrer"
              className="h-[65vh] min-h-80 w-full rounded-lg border border-[var(--color-line)] bg-white"
            />
          )
        ) : null}
      </div>
    </div>
  );
}

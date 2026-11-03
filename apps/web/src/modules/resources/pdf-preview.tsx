'use client';
import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { Button, Notice } from '@/components/ui';
/** Render pages locally instead of relying on browser PDF plugins or third-party viewers. */
export function ResourcePdfPreview({
  url,
  title,
  autoOpen = false,
}: {
  url: string;
  title: string;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let destroy: (() => void) | undefined;
    void import('pdfjs-dist')
      .then(async (viewer) => {
        if (cancelled) return;
        viewer.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString();
        const task = viewer.getDocument({
          url,
          withCredentials: true,
          enableXfa: false,
          useWorkerFetch: false,
        });
        destroy = () => {
          void task.destroy();
        };
        const document = await task.promise;
        if (!cancelled) {
          setPdf(document);
          setPage(1);
          setError('');
        }
      })
      .catch(() => {
        if (!cancelled)
          setError('Preview could not be loaded. You can still use View document or Download.');
      });
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [url, open]);
  useEffect(() => {
    if (!pdf || !canvas.current) return;
    const element = canvas.current;
    let cancelled = false;
    let render: RenderTask | undefined;
    void pdf
      .getPage(Math.min(page, pdf.numPages))
      .then(async (source) => {
        if (cancelled) return;
        const natural = source.getViewport({ scale: 1 });
        const scale = Math.min(1.5, 1600 / natural.width, 2200 / natural.height);
        if (!Number.isFinite(scale) || scale <= 0) throw new Error('Invalid PDF page size.');
        const viewport = source.getViewport({ scale });
        element.width = Math.ceil(viewport.width);
        element.height = Math.ceil(viewport.height);
        render = source.render({ canvas: element, viewport });
        await render.promise;
      })
      .catch((error) => {
        if (!cancelled && error?.name !== 'RenderingCancelledException')
          setError('This page could not be previewed. Download the original document to view it.');
      });
    return () => {
      cancelled = true;
      render?.cancel();
    };
  }, [pdf, page]);
  if (!open)
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Preview document
      </Button>
    );
  return (
    <section aria-label={`${title} PDF preview`} className="space-y-2">
      {error ? <Notice tone="warn">{error}</Notice> : null}
      {!pdf && !error ? (
        <p role="status" className="text-sm">
          Loading document preview…
        </p>
      ) : null}
      {pdf ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Button
            type="button"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous page
          </Button>
          <span aria-live="polite">
            Page {page} of {pdf.numPages}
          </span>
          <Button
            type="button"
            variant="secondary"
            disabled={page >= pdf.numPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next page
          </Button>
        </div>
      ) : null}
      <canvas
        ref={canvas}
        aria-label={`${title}, page ${page}`}
        className="h-auto w-full rounded-lg border border-[var(--color-line)] bg-white"
      />
    </section>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { Notice } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';

const MAX_FILE_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

/** Keep the accumulated selection on a separate input so each new picker batch can be cleared. */
export function TicketAttachmentPicker({ disabled = false }: { disabled?: boolean }) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const submission = useRef<HTMLInputElement>(null);

  function updateFiles(next: File[]) {
    const transfer = new DataTransfer();
    for (const file of next) transfer.items.add(file);
    if (submission.current) submission.current.files = transfer.files;
    setFiles(next);
  }

  function addFiles(incoming: FileList | null) {
    if (!incoming || disabled) return;
    updateFiles([...files, ...Array.from(incoming)]);
  }

  useEffect(() => {
    const form = submission.current?.form;
    function reset() {
      setFiles([]);
      setDragging(false);
      if (submission.current) submission.current.value = '';
      if (picker.current) picker.current.value = '';
    }
    form?.addEventListener('reset', reset);
    return () => form?.removeEventListener('reset', reset);
  }, []);

  const oversized = files.filter((file) => file.size > MAX_FILE_BYTES);
  const total = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="space-y-2">
      <input ref={submission} type="file" name="files" multiple hidden disabled={disabled} />
      <input
        ref={picker}
        type="file"
        multiple
        hidden
        disabled={disabled}
        onChange={(event) => {
          addFiles(event.currentTarget.files);
          event.currentTarget.value = '';
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => picker.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
        className={`w-full rounded-[var(--radius-control)] border-2 border-dashed px-3 py-4 text-center text-sm text-[var(--color-ink-muted)] disabled:opacity-50 ${dragging ? 'border-[var(--color-ink)] bg-[var(--color-surface-muted)]' : 'border-[var(--color-line)] bg-[var(--color-surface)]'}`}
      >
        <span className="block font-medium">Drop files here or click to attach</span>
        <span className="mt-1 block text-[11px] text-[var(--color-ink-subtle)]">
          Add files one by one or together · 3 MB per file · 10 MB total
        </span>
      </button>
      {files.length > 0 ? (
        <ul aria-label="Selected attachments" aria-live="polite" className="space-y-1">
          {files.map((file, index) => (
            <li
              key={index}
              className="flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-line)] px-2 py-1.5 text-xs text-[var(--color-ink-muted)]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-7 w-7 shrink-0"
              >
                <path d="M6 3h8l4 4v14H6zM14 3v5h4" />
                {file.type.startsWith('image/') ? (
                  <path d="m8 17 3-4 2 2 2-3 2 5M9 10h.01" />
                ) : (
                  <path d="M9 12h6M9 16h6" />
                )}
              </svg>
              <span className="min-w-0 flex-1">
                <span className="block truncate" title={file.name}>
                  {file.name}
                </span>
                <span className="text-[10px] text-[var(--color-ink-subtle)]">
                  {Math.ceil(file.size / 1024)} KB
                </span>
              </span>
              <IconButton
                icon="remove"
                label={`Remove ${file.name}`}
                disabled={disabled}
                onClick={() => updateFiles(files.filter((_, position) => position !== index))}
              />
            </li>
          ))}
        </ul>
      ) : null}
      {oversized.length > 0 ? (
        <Notice tone="alert">
          {oversized.map((file) => file.name).join(', ')} exceeds 3 MB per file. Remove it or send a
          cloud link.
        </Notice>
      ) : null}
      {total > MAX_TOTAL_BYTES ? (
        <Notice tone="alert">
          Attachments exceed 10 MB in total. Remove files or send a cloud link.
        </Notice>
      ) : null}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { SettingsDrawer } from '@/components/ui/settings-drawer';
import { AttachmentItem } from '@/app/(app)/support/tickets/[id]/attachment-item';
import { DocumentLinks } from './document-links';

type Image = {
  id: string;
  fileName: string;
  contentType: string;
  bytes: number;
  authorName: string;
};

export function TaskFilesDrawer({
  taskId,
  canManage,
  links,
  attachments,
}: {
  taskId: string;
  canManage: boolean;
  links: { id: string; url: string; title: string }[];
  attachments: Image[];
}) {
  const [open, setOpen] = useState(false);
  const files = [...new Map(attachments.map((file) => [file.id, file])).values()];
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-ink)] shadow-sm hover:bg-[var(--color-surface-muted)]"
      >
        Documents &amp; attachments · {links.length + files.length}
      </button>
      <SettingsDrawer title="Documents & attachments" open={open} onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <section>
            <h3 className="mb-3 text-sm font-semibold">Update attachments · {files.length}</h3>
            {files.length ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {files.map((file) => (
                  <li key={file.id} className="min-w-0">
                    <AttachmentItem
                      ticketId={taskId}
                      attachmentBase="/api/tasks"
                      attachment={{
                        id: file.id,
                        fileName: file.fileName,
                        sizeLabel: `${Math.round(file.bytes / 1024)} KB`,
                        previewable: ['image/png', 'image/jpeg', 'image/webp'].includes(
                          file.contentType,
                        ),
                      }}
                    />
                    <p className="mt-1 truncate text-xs text-[var(--color-ink-subtle)]">
                      {file.authorName}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--color-ink-subtle)]">No update attachments yet.</p>
            )}
          </section>
          <DocumentLinks taskId={taskId} links={links} canManage={canManage} />
        </div>
      </SettingsDrawer>
    </>
  );
}

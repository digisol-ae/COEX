import sharp from 'sharp';
import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { toObjectId } from '@/lib/ids';
import { fileStorage } from '@/lib/storage';
import { recordAudit } from '@/modules/core/services/audit.service';
import { repository } from '@/lib/repository';
import { TicketMessageModel } from '../models/ticket-message.model';
import { TicketModel } from '../models/ticket.model';

/**
 * Attachments on a ticket.
 *
 * Customers send screenshots, and a screenshot from a modern phone is four megabytes of which
 * about two hundred kilobytes carry the information. Left alone, a year of support turns into tens
 * of gigabytes that are slow to open, expensive to keep and painful to back up. So images are
 * resized and re-encoded on the way in, and the original size is kept beside the new one so nobody
 * has to wonder whether something was lost.
 *
 * Only images are processed. A PDF, a log file or a database dump is stored exactly as it arrived,
 * because a support attachment is often evidence and evidence that has been quietly altered is
 * worth less than a large file.
 */

const messages = () => repository(TicketMessageModel);
const tickets = () => repository(TicketModel);

/** Beyond this, the picture is bigger than any screen it will be read on. */
const MAX_IMAGE_EDGE = 2000;

/** One file, not one upload: ten small screenshots are fine, a virtual machine image is not. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

const PROCESSED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface IncomingFile {
  fileName: string;
  contentType: string;
  body: Buffer;
}

export interface StoredAttachment {
  fileName: string;
  contentType: string;
  storageKey: string;
  bytes: number;
  originalBytes: number | null;
  processedAt: Date | null;
}

/**
 * Compression, with a rule that stops it doing harm.
 *
 * If the re-encoded image is not actually smaller, the original is kept. A small, already
 * optimised PNG can grow when re-encoded, and shipping a worse file than the one that arrived is
 * not a saving.
 */
async function prepare(file: IncomingFile): Promise<{ body: Buffer; processed: boolean }> {
  if (!PROCESSED_IMAGE_TYPES.has(file.contentType)) return { body: file.body, processed: false };

  try {
    const image = sharp(file.body, { failOn: 'error' });
    const meta = await image.metadata();

    const tooBig = (meta.width ?? 0) > MAX_IMAGE_EDGE || (meta.height ?? 0) > MAX_IMAGE_EDGE;

    const pipeline = tooBig
      ? image.resize({ width: MAX_IMAGE_EDGE, height: MAX_IMAGE_EDGE, fit: 'inside' })
      : image;

    const body =
      file.contentType === 'image/png'
        ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
        : await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();

    if (body.byteLength >= file.body.byteLength) return { body: file.body, processed: false };

    return { body, processed: true };
  } catch {
    // A file that claims to be an image and is not still belongs on the ticket. It is stored as it
    // arrived rather than rejected, because the customer is trying to tell us something.
    return { body: file.body, processed: false };
  }
}

export async function attachToMessage(
  messageId: string,
  files: IncomingFile[],
): Promise<StoredAttachment[]> {
  await connectToDatabase();

  const message = await messages().findById(messageId);
  if (!message) throw new Error('Message not found.');

  const storage = fileStorage();
  const stored: StoredAttachment[] = [];

  for (const file of files) {
    if (file.body.byteLength === 0) continue;

    if (file.body.byteLength > MAX_FILE_BYTES) {
      throw new Error(
        `${file.fileName} is larger than ${Math.round(MAX_FILE_BYTES / (1024 * 1024))}MB. Send a link to it instead.`,
      );
    }

    const { body, processed } = await prepare(file);

    const saved = await storage.put({
      tenantId: String(getContext().tenantId),
      fileName: file.fileName,
      contentType: file.contentType,
      body,
    });

    stored.push({
      fileName: file.fileName,
      contentType: file.contentType,
      storageKey: saved.key,
      bytes: saved.bytes,
      originalBytes: processed ? file.body.byteLength : null,
      processedAt: processed ? new Date() : null,
    });
  }

  if (stored.length === 0) return [];

  await messages().updateOne({ _id: message._id }, { $push: { attachments: { $each: stored } } });

  await tickets().updateOne({ _id: message.ticketId }, { $set: { lastActivityAt: new Date() } });

  await recordAudit({
    action: 'ticket.attachment_added',
    entityType: 'Ticket',
    entityId: message.ticketId,
    after: { files: stored.map((file) => file.fileName) },
  });

  return stored;
}

export interface AttachmentForDownload {
  fileName: string;
  contentType: string;
  body: Buffer;
}

/**
 * Reading one attachment back.
 *
 * The lookup is tenant scoped through the repository, so a key from another tenant simply is not
 * found. Nothing in the product hands out a storage key or a direct file URL: every download goes
 * through here, which is what keeps a leaked link from outliving the permission that created it.
 */
export async function attachmentForDownload(
  ticketId: string,
  attachmentId: string,
): Promise<AttachmentForDownload | null> {
  await connectToDatabase();

  const ticket = await tickets().findById(ticketId);
  if (!ticket) return null;

  const message = await messages().findOne({
    ticketId: ticket._id,
    'attachments._id': toObjectId(attachmentId),
  });

  if (!message) return null;

  const attachment = message.attachments.find(
    (candidate) => String(candidate._id) === attachmentId,
  );

  if (!attachment) return null;

  const body = await fileStorage().get(attachment.storageKey);

  return {
    fileName: attachment.fileName,
    contentType: attachment.contentType,
    body,
  };
}

/** Human sizes, because "2483921 bytes" tells nobody whether it was worth compressing. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

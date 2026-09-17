import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { toOptionalObjectId } from '@/lib/ids';
import { recordAudit } from '@/modules/core/services/audit.service';
import { CannedReplyModel } from '../models/canned-reply.model';

export { expandCannedReply, PLACEHOLDERS, type ReplyContext } from '../canned-reply-text';

/**
 * Saved replies.
 *
 * Stored with placeholders and expanded at the moment of insertion, never before. A template
 * corrected today then improves every reply sent tomorrow, and an agent still reads and edits what
 * lands in the box: the saved reply is a first draft, not an outgoing message.
 *
 * useCount is kept so the desk can see which replies earn their place. A reply nobody has used in
 * a year is a reply that is either wrong or unfindable, and both are worth knowing.
 */

const replies = () => repository(CannedReplyModel);

export interface CannedReplySummary {
  id: string;
  title: string;
  body: string;
  queueId: string | null;
  useCount: number;
  isArchived: boolean;
}

export async function listCannedReplies(
  options: { queueId?: string | null; includeArchived?: boolean } = {},
): Promise<CannedReplySummary[]> {
  await connectToDatabase();

  const filter: Record<string, unknown> = {};

  if (!options.includeArchived) filter.status = 'active';

  // A reply attached to a queue belongs to that queue; a reply with no queue belongs to everyone.
  if (options.queueId) {
    filter.$or = [{ queueId: toOptionalObjectId(options.queueId) }, { queueId: null }];
  }

  const found = await replies().find(filter).sort({ useCount: -1, title: 1 });

  return found.map((reply) => ({
    id: String(reply._id),
    title: reply.title,
    body: reply.body,
    queueId: reply.queueId ? String(reply.queueId) : null,
    useCount: reply.useCount ?? 0,
    isArchived: reply.status === 'archived',
  }));
}

export interface CannedReplyInput {
  title: string;
  body: string;
  queueId?: string | null;
}

export async function createCannedReply(input: CannedReplyInput): Promise<string> {
  await connectToDatabase();

  const title = input.title.trim();
  const body = input.body.trim();

  if (!title) throw new Error('A saved reply needs a title, so an agent can find it.');
  if (!body) throw new Error('A saved reply needs a body.');

  const created = await replies().create({
    title,
    body,
    queueId: toOptionalObjectId(input.queueId),
    status: 'active',
  });

  await recordAudit({
    action: 'canned_reply.created',
    entityType: 'CannedReply',
    entityId: created._id,
    after: { title },
  });

  return String(created._id);
}

export async function updateCannedReply(id: string, input: CannedReplyInput): Promise<void> {
  await connectToDatabase();

  const title = input.title.trim();
  const body = input.body.trim();

  if (!title) throw new Error('A saved reply needs a title, so an agent can find it.');
  if (!body) throw new Error('A saved reply needs a body.');

  const updated = await replies().updateOne(
    { _id: id },
    { $set: { title, body, queueId: toOptionalObjectId(input.queueId) } },
  );

  if (!updated) throw new Error('Saved reply not found.');
}

export async function archiveCannedReply(id: string): Promise<void> {
  await connectToDatabase();

  const updated = await replies().updateOne({ _id: id }, { $set: { status: 'archived' } });
  if (!updated) throw new Error('Saved reply not found.');
}

export async function restoreCannedReply(id: string): Promise<void> {
  await connectToDatabase();

  await replies().updateOne({ _id: id }, { $set: { status: 'active' } });
}

/** Counted when a reply is actually sent, not when it is inserted into the box and then deleted. */
export async function recordCannedReplyUse(id: string): Promise<void> {
  await connectToDatabase();

  await replies().updateOne({ _id: id }, { $inc: { useCount: 1 } });
}

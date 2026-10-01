import type { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { NotificationModel } from '../models/notification.model';

/** The kinds a browser shows (John, 1 Oct 2026); other alerts are recorded but stay quiet. */
export const BROWSER_KINDS = ['task_assigned', 'ticket_assigned', 'ticket_created'] as const;

export async function recordNotification(input: {
  userId: Types.ObjectId | string;
  kind: string;
  title: string;
  body?: string;
  link?: string | null;
}): Promise<void> {
  await NotificationModel.create({
    tenantId: getContext().tenantId,
    userId: input.userId,
    kind: input.kind,
    title: input.title.slice(0, 200),
    body: (input.body ?? '').slice(0, 300),
    link: input.link ?? null,
  });
}

export interface NotificationView {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
}

/** The signed-in person's notifications after a moment, oldest first, for the browser to show. */
export async function notificationsSince(after: Date): Promise<NotificationView[]> {
  await connectToDatabase();
  const { tenantId, userId } = getContext();
  const found = await NotificationModel.find({
    tenantId,
    userId,
    kind: { $in: [...BROWSER_KINDS] },
    createdAt: { $gt: after },
  })
    .sort({ createdAt: 1 })
    .limit(20);
  return found.map((item) => ({
    id: String(item._id),
    kind: item.kind,
    title: item.title,
    body: item.body ?? '',
    link: item.link ?? null,
    createdAt: item.createdAt.toISOString(),
  }));
}

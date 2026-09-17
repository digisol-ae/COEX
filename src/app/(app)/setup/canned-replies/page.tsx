import { asUser, requirePermission } from '@/lib/session';
import { listCannedReplies } from '@/modules/tickets/services/canned-reply.service';
import { listQueues } from '@/modules/tickets/services/queue.service';
import { PageHeader } from '@/components/ui';
import { CannedReplyList } from './reply-list';

export const metadata = { title: 'Saved replies · COEX' };

export default async function CannedRepliesPage() {
  const actor = await requirePermission('ticket.manage');

  const { replies, queues } = await asUser(actor, async () => ({
    replies: await listCannedReplies({ includeArchived: true }),
    queues: await listQueues({ includeArchived: true }),
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Saved replies"
        description="First drafts, not outgoing messages. Placeholders fill when a reply is inserted, so correcting a template here improves every reply sent tomorrow."
      />

      <div className="mt-4">
        <CannedReplyList
          replies={replies}
          queues={queues.map((queue) => ({ id: queue.id, name: queue.name }))}
        />
      </div>
    </div>
  );
}

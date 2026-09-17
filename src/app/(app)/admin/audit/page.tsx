import { asUser, requirePermission } from '@/lib/session';
import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { AuditLogModel } from '@/modules/core/models/audit-log.model';
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from '@/components/ui';

export const metadata = { title: 'Audit log · COEX' };

/** Alarming actions are the only ones that carry colour, so the page reads calmly at a glance. */
const ALERT_ACTIONS = new Set(['auth.sign_in_failed', 'user.suspended', 'user.password_reset']);

async function recentEntries(limit = 100) {
  await connectToDatabase();

  const { tenantId } = getContext();

  const entries = await AuditLogModel.find({ tenantId }).sort({ at: -1 }).limit(limit);

  return entries.map((entry) => ({
    id: String(entry._id),
    action: entry.action,
    entityType: entry.entityType,
    actorEmail: entry.actorEmail,
    at: entry.at,
    after: entry.after,
  }));
}

export default async function AuditPage() {
  const actor = await requirePermission('audit.read');
  const entries = await asUser(actor, () => recentEntries());

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Audit log"
        description="Append only. Nothing in the product edits or deletes an entry, which is what makes it usable as evidence. The hundred most recent entries are shown."
      />

      <Card>
        {entries.length === 0 ? (
          <EmptyState message="No activity recorded yet." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Action</Th>
                <Th>Entity</Th>
                <Th>Actor</Th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <Td className="whitespace-nowrap text-[var(--color-ink-muted)]">
                    {entry.at.toLocaleString('en-GB')}
                  </Td>
                  <Td>
                    <Badge tone={ALERT_ACTIONS.has(entry.action) ? 'alert' : 'neutral'}>
                      {entry.action}
                    </Badge>
                  </Td>
                  <Td className="text-[var(--color-ink-muted)]">{entry.entityType}</Td>
                  <Td className="text-[var(--color-ink-muted)]">{entry.actorEmail ?? 'System'}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { fileStorage } from '@/lib/storage';
import { UserModel } from '@/modules/core/models/user.model';
import { queueEmail } from '@/modules/core/services/email.service';
import { recordAudit } from '@/modules/core/services/audit.service';
import { STATUS_LABELS } from '@/modules/tickets/labels';
import { buildActivityReport } from '../activity-report';
import { formatMinutes } from '../week';
import { listTeamActivity, type ActivityFilter } from './activity.service';

/**
 * The Team activity report as a PDF, downloaded or emailed (John, 9 Oct 2026). The email goes
 * through the outbox like every other mail, with the PDF stored first and attached at send time.
 * Callers check `timesheet.read.all`.
 */

const formatWhen = (date: Date) =>
  date.toLocaleString('en-GB', {
    timeZone: 'Asia/Dubai',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export async function buildReportFor(filter: ActivityFilter) {
  await connectToDatabase();
  const { tenantId, userId } = getContext();

  const rows = await listTeamActivity(filter);
  const me = await UserModel.findOne({ _id: userId, tenantId }).select('name');

  const people = filter.userIds?.length
    ? (await UserModel.find({ tenantId, _id: { $in: filter.userIds } }).select('name')).map(
        (user) => user.name,
      )
    : [];
  const kinds = filter.kinds ?? ['task', 'ticket'];

  const periodLabel =
    filter.fromDay === filter.toDay ? filter.fromDay : `${filter.fromDay} to ${filter.toDay}`;
  const filtersLabel = [
    people.length ? people.join(', ') : 'Everyone',
    kinds.length === 2 ? 'Tasks and tickets' : kinds[0] === 'task' ? 'Tasks only' : 'Tickets only',
    filter.status
      ? `Stage: ${(STATUS_LABELS as Record<string, string>)[filter.status] ?? filter.status}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const bytes = await buildActivityReport({
    title: 'Team activity',
    periodLabel,
    filtersLabel,
    generatedBy: me?.name ?? 'COEX',
    generatedAt: formatWhen(new Date()),
    rows: rows.map((row) => ({
      userName: row.userName,
      kind: row.kind,
      number: row.number,
      title: row.title,
      stage:
        row.kind === 'ticket'
          ? ((STATUS_LABELS as Record<string, string>)[row.status] ?? row.status)
          : row.status,
      minutes: row.minutes,
      running: row.running,
      lastWorked: formatWhen(row.lastWorkedAt),
    })),
  });

  return {
    bytes,
    rows,
    periodLabel,
    filtersLabel,
    fileName: `team-activity-${filter.fromDay}${filter.fromDay === filter.toDay ? '' : `-to-${filter.toDay}`}.pdf`,
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Queues the report to each address. Returns how many were queued. */
export async function emailActivityReport(
  filter: ActivityFilter,
  recipients: string[],
  note: string,
): Promise<number> {
  const addresses = [...new Set(recipients.map((address) => address.trim().toLowerCase()))].filter(
    (address) => EMAIL.test(address),
  );
  if (addresses.length === 0) throw new Error('Enter at least one valid email address.');
  if (addresses.length > 10) throw new Error('Send to at most ten people at a time.');

  const report = await buildReportFor(filter);
  const stored = await fileStorage().put({
    tenantId: String(getContext().tenantId),
    fileName: report.fileName,
    contentType: 'application/pdf',
    body: report.bytes,
  });

  const total = report.rows.reduce((sum, row) => sum + row.minutes, 0);
  const text = [
    note.trim(),
    note.trim() ? '' : null,
    `Team activity, ${report.periodLabel}`,
    report.filtersLabel,
    `${report.rows.length} ${report.rows.length === 1 ? 'row' : 'rows'}, ${formatMinutes(total)} recorded.`,
    'The full report is attached as a PDF.',
  ]
    .filter((line) => line !== null)
    .join('\n');

  let queued = 0;
  for (const to of addresses) {
    const accepted = await queueEmail({
      kind: 'activity_report',
      to,
      subject: `Team activity, ${report.periodLabel}`,
      text,
      attachments: [
        { fileName: report.fileName, contentType: 'application/pdf', storageKey: stored.key },
      ],
    });
    if (accepted) queued += 1;
  }

  if (queued === 0) throw new Error('Sending email is turned off in Setup, Email.');

  await recordAudit({
    action: 'time.activity_report_emailed',
    entityType: 'Report',
    after: { recipients: addresses, period: report.periodLabel },
  });

  return queued;
}

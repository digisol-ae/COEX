import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { runWithContext } from '@/lib/tenant-context';
import { TenantModel } from '@/modules/core/models/tenant.model';
import { UserModel } from '@/modules/core/models/user.model';
import { EmailSettingsModel } from '@/modules/core/models/email-settings.model';
import { queueEmail } from '@/modules/core/services/email.service';
import { TimeEntryModel } from '../models/time-entry.model';
import {
  agentEmail,
  gulfNow,
  isWorkingDay,
  previousDayKey,
  summaryEmail,
  type AgentDay,
} from '../daily-report';

/**
 * The daily performance email, sent by the email worker (John, 10 Oct 2026).
 *
 * The worker calls this every few minutes. From nine in the morning, Gulf time, it reports once on
 * the previous working day: the day is claimed with an atomic update before anything is queued, so
 * a restart, a second worker or a slow loop can never send a day twice. A failed send is lost
 * rather than repeated, the same trade as renewal reminders. Saturday, Sunday and any other day
 * outside the tenant's working calendar are skipped, and so is the morning after one.
 *
 * Agents here are people with the agent or senior agent role who are active. Managers and
 * administrators are not nagged about their own hours; they receive the combined summary.
 */

const AGENT_ROLES: ('agent' | 'senior_agent')[] = ['agent', 'senior_agent'];

export async function sendDailyReportForTenant(
  tenantId: Types.ObjectId,
  now: Date = new Date(),
): Promise<number> {
  const settings = await EmailSettingsModel.findOne({ tenantId });
  if (!settings?.dailyReport?.enabled) return 0;

  const { dayKey: today, hour } = gulfNow(now);
  if (hour < 9) return 0;

  const tenant = await TenantModel.findById(tenantId).select('workingDays');
  const day = previousDayKey(today);
  if (!isWorkingDay(day, tenant?.workingDays ?? [1, 2, 3, 4, 5])) return 0;

  const claimed = await EmailSettingsModel.findOneAndUpdate(
    { _id: settings._id, 'dailyReport.lastSentFor': { $ne: day } },
    { $set: { 'dailyReport.lastSentFor': day } },
    { returnDocument: 'after' },
  );
  if (!claimed) return 0;

  const minimumMinutes = Math.round((settings.dailyReport.minimumHours ?? 6) * 60);

  // A work date is stored as that day's midnight in the Gulf.
  const from = new Date(`${day}T00:00:00+04:00`);
  const until = new Date(from.getTime() + 24 * 3600 * 1000);

  const agents = await UserModel.find({
    tenantId,
    role: { $in: AGENT_ROLES },
    status: 'active',
    deletedAt: null,
  }).select('name email');

  const entries = await TimeEntryModel.find({
    tenantId,
    userId: { $in: agents.map((agent) => agent._id) },
    workDate: { $gte: from, $lt: until },
    deletedAt: null,
  }).select('userId taskId ticketId minutes');

  const perAgent = new Map<string, { minutes: number; items: Set<string> }>();
  for (const entry of entries) {
    const row = perAgent.get(String(entry.userId)) ?? { minutes: 0, items: new Set<string>() };
    row.minutes += entry.minutes ?? 0;
    row.items.add(String(entry.taskId ?? entry.ticketId));
    perAgent.set(String(entry.userId), row);
  }

  const days: AgentDay[] = agents.map((agent) => ({
    name: agent.name,
    minutes: perAgent.get(String(agent._id))?.minutes ?? 0,
    items: perAgent.get(String(agent._id))?.items.size ?? 0,
  }));

  let queued = 0;

  return runWithContext(
    // No signed in person: a fresh id means nobody is skipped as "the one acting".
    { tenantId, userId: new Types.ObjectId(), isPlatformAdmin: false },
    async () => {
      for (const [index, agent] of agents.entries()) {
        if (!agent.email) continue;
        const message = agentEmail(day, days[index], minimumMinutes);
        if (await queueEmail({ kind: 'daily_report', to: agent.email, ...message })) queued += 1;
      }

      const summary = summaryEmail(day, days, minimumMinutes);
      for (const address of settings.dailyReport?.summaryRecipients ?? []) {
        if (await queueEmail({ kind: 'daily_report', to: address, ...summary })) queued += 1;
      }

      return queued;
    },
  );
}

export async function sendDailyReports(now: Date = new Date()): Promise<number> {
  await connectToDatabase();

  let total = 0;
  for (const tenant of await TenantModel.find({}).select('_id')) {
    try {
      total += await sendDailyReportForTenant(tenant._id, now);
    } catch (error) {
      console.error(
        `Daily report failed for tenant ${tenant._id}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
  return total;
}

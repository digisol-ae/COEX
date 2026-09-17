import { connectToDatabase } from '@/lib/db';
import { toObjectId } from '@/lib/ids';
import { getContext } from '@/lib/tenant-context';
import { TaskModel } from '../models/task.model';
import { PortfolioModel } from '../models/portfolio.model';
import { UserModel } from '@/modules/core/models/user.model';
import { TimeEntryModel } from '@/modules/time/models/time-entry.model';
import { endOfWeek, startOfWeek } from '@/modules/time/week';

/**
 * The numbers behind the dashboard.
 *
 * Counts run as countDocuments against indexed fields rather than loading tasks and counting in
 * memory, so the screen stays fast as the task count grows. The dashboard is the first screen
 * after login, which means it has to be quick every single time.
 */

export interface DashboardTiles {
  open: number;
  overdue: number;
  dueToday: number;
  unassigned: number;
  blocked: number;
}

export interface GroupCount {
  label: string;
  count: number;
  id?: string;
}

export interface DashboardData {
  tiles: DashboardTiles;
  byPortfolio: GroupCount[];
  byAssignee: GroupCount[];
  ageing: { number: string; title: string; days: number; id: string }[];
  /** Time logged this week against the estimate on the same open work. */
  week: { loggedMinutes: number; estimatedMinutes: number };
}

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday(): Date {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

export async function loadDashboard(scope: {
  /** An agent sees only their own work, a manager and above see the whole tenant. */
  onlyAssigneeId?: string;
}): Promise<DashboardData> {
  await connectToDatabase();

  const { tenantId } = getContext();

  const base: Record<string, unknown> = { tenantId, deletedAt: null, isClosed: false };
  if (scope.onlyAssigneeId) base.assigneeIds = scope.onlyAssigneeId;

  const [open, overdue, dueToday, unassigned, blocked] = await Promise.all([
    TaskModel.countDocuments(base),
    TaskModel.countDocuments({ ...base, dueDate: { $lt: startOfToday() } }),
    TaskModel.countDocuments({ ...base, dueDate: { $gte: startOfToday(), $lte: endOfToday() } }),
    TaskModel.countDocuments({ ...base, assigneeIds: { $size: 0 } }),
    TaskModel.countDocuments({ ...base, status: 'Blocked' }),
  ]);

  const portfolios = await PortfolioModel.find({ tenantId, deletedAt: null }).sort({ name: 1 });

  const byPortfolio = await Promise.all(
    portfolios.map(async (portfolio) => ({
      id: String(portfolio._id),
      label: portfolio.name,
      count: await TaskModel.countDocuments({ ...base, portfolioId: portfolio._id }),
    })),
  );

  const users = await UserModel.find({ tenantId, status: 'active', deletedAt: null }).select(
    'name',
  );

  const byAssignee = await Promise.all(
    users.map(async (user) => ({
      id: String(user._id),
      label: user.name,
      count: await TaskModel.countDocuments({ ...base, assigneeIds: user._id }),
    })),
  );

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const stale = await TaskModel.find({ ...base, lastActivityAt: { $lt: sevenDaysAgo } })
    .sort({ lastActivityAt: 1 })
    .limit(10);

  const weekStart = startOfWeek(new Date());

  const [loggedThisWeek] = await TimeEntryModel.aggregate<{ minutes: number }>([
    {
      $match: {
        tenantId,
        deletedAt: null,
        workDate: { $gte: weekStart, $lt: endOfWeek(new Date()) },
        ...(scope.onlyAssigneeId ? { userId: toObjectId(scope.onlyAssigneeId) } : {}),
      },
    },
    { $group: { _id: null, minutes: { $sum: '$minutes' } } },
  ]);

  const [estimated] = await TaskModel.aggregate<{ minutes: number }>([
    { $match: { ...base, estimateMinutes: { $gt: 0 } } },
    { $group: { _id: null, minutes: { $sum: '$estimateMinutes' } } },
  ]);

  return {
    week: {
      loggedMinutes: loggedThisWeek?.minutes ?? 0,
      estimatedMinutes: estimated?.minutes ?? 0,
    },
    tiles: { open, overdue, dueToday, unassigned, blocked },
    byPortfolio: byPortfolio.filter((row) => row.count > 0),
    byAssignee: byAssignee.filter((row) => row.count > 0).sort((a, b) => b.count - a.count),
    ageing: stale.map((task) => ({
      id: String(task._id),
      number: task.number,
      title: task.title,
      days: Math.floor(
        (Date.now() - (task.lastActivityAt ?? task.updatedAt).getTime()) / (24 * 60 * 60 * 1000),
      ),
    })),
  };
}

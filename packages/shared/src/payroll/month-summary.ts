// "Month at a glance" for payslip page 2 (People & Recognition R1).
// Pure function: the service layer loads the records and maps them from the
// Worktello task / ticket / time models into these shapes.
import { countDays, maxDate, minDate, periodBounds } from './calendar';
import { leaveBalance, leaveDaysInRange } from './leave';
import type { Employee, LeaveRequest, LeaveType, PayrollSettings } from './schemas';

export type TimeEntry = { userId: string; date: string; minutes: number; kind: 'task' | 'ticket' };
export type TaskRecord = {
  id: string;
  assigneeId: string;
  createdAt: string;
  dueDate?: string;
  closedAt?: string;
};
export type TicketRecord = {
  id: string;
  assigneeId: string;
  createdAt: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  slaDueAt?: string;
  rating?: number; // rating 1-5
};

export type MonthSummary = {
  period: string;
  leave: {
    taken: { code: string; name: string; days: number }[];
    lopDays: number;
    balances: { code: string; name: string; balance: number }[];
    pendingRequests: number;
  };
  time: {
    workingDays: number;
    leaveDays: number;
    daysWithTime: number;
    taskHours: number;
    ticketHours: number;
    totalHours: number;
    avgHoursPerDay: number;
  };
  tasks: { assigned: number; closed: number; onTimePct: number | null; overdueAtMonthEnd: number };
  tickets: {
    closed: number;
    avgFirstResponseMins: number | null;
    avgResolutionHours: number | null;
    slaMetPct: number | null;
    avgRating: number | null;
    ratings: number;
  };
};

const r1 = (x: number) => Math.round(x * 10) / 10;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const inRange = (iso: string | undefined, start: string, end: string) =>
  !!iso && iso.slice(0, 10) >= start && iso.slice(0, 10) <= end;
const mins = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 60000;

export function buildMonthSummary(opts: {
  period: string;
  settings: PayrollSettings;
  employee: Employee;
  /** Worktello user id linked to the employee (time/tasks/tickets use user ids) */
  userId: string;
  leaveTypes: LeaveType[];
  leaveRequests: LeaveRequest[];
  carriedForward?: Record<string, number>;
  timeEntries: TimeEntry[];
  tasks: TaskRecord[];
  tickets: TicketRecord[];
}): MonthSummary {
  const { period, settings: s, employee: e, userId } = opts;
  const { start, end } = periodBounds(period);
  const from = maxDate(e.joinDate, start),
    to = e.exitDate ? minDate(e.exitDate, end) : end;

  // Leave
  const mine = opts.leaveRequests.filter((r) => r.employeeId === e.id);
  const approved = mine.filter((r) => r.status === 'approved');
  const taken = opts.leaveTypes
    .map((t) => ({
      code: t.code,
      name: t.name,
      days: approved
        .filter((r) => r.typeCode === t.code)
        .reduce((a, r) => a + leaveDaysInRange(r, from, to, s), 0),
    }))
    .filter((t) => t.days > 0);
  const lopDays = taken
    .filter((t) => !opts.leaveTypes.find((x) => x.code === t.code)!.paid)
    .reduce((a, t) => a + t.days, 0);
  const leaveDays = taken.reduce((a, t) => a + t.days, 0);
  const balances = opts.leaveTypes
    .filter((t) => t.paid && t.annualEntitlement > 0)
    .map((t) => ({
      code: t.code,
      name: t.name,
      balance: leaveBalance({
        type: t,
        joinDate: e.joinDate,
        asOf: end,
        year: +period.slice(0, 4),
        carriedForward: opts.carriedForward?.[t.code],
        requests: mine,
        employeeId: e.id,
        settings: s,
      }).balance,
    }));
  const pendingRequests = mine.filter((r) => r.status === 'pending').length;

  // Time (logged against tasks and tickets only)
  const entries = opts.timeEntries.filter(
    (t) => t.userId === userId && t.date >= from && t.date <= to,
  );
  const sumH = (k: TimeEntry['kind']) =>
    entries.filter((t) => t.kind === k).reduce((a, t) => a + t.minutes, 0) / 60;
  const workingDays = from <= to ? countDays(from, to, { ...s, dayBasis: 'working' }) : 0;
  const taskHours = sumH('task'),
    ticketHours = sumH('ticket'),
    totalHours = taskHours + ticketHours;
  const daysAvailable = Math.max(0, workingDays - leaveDays);

  // Tasks
  const tasks = opts.tasks.filter((t) => t.assigneeId === userId);
  const assigned = tasks.filter(
    (t) => t.createdAt.slice(0, 10) <= end && (!t.closedAt || t.closedAt.slice(0, 10) >= start),
  );
  const closed = tasks.filter((t) => inRange(t.closedAt, start, end));
  const withDue = closed.filter((t) => t.dueDate);
  const onTime = withDue.filter((t) => t.closedAt!.slice(0, 10) <= t.dueDate!.slice(0, 10));
  const overdue = tasks.filter(
    (t) =>
      t.dueDate &&
      t.dueDate.slice(0, 10) < end &&
      t.createdAt.slice(0, 10) <= end &&
      (!t.closedAt || t.closedAt.slice(0, 10) > end),
  );

  // Tickets
  const tickets = opts.tickets.filter((t) => t.assigneeId === userId);
  const resolved = tickets.filter((t) => inRange(t.resolvedAt, start, end));
  const responded = tickets.filter((t) => inRange(t.firstResponseAt, start, end));
  const slaTracked = resolved.filter((t) => t.slaDueAt);
  const rated = resolved.filter((t) => typeof t.rating === 'number');
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : null);
  const fr = avg(responded.map((t) => mins(t.createdAt, t.firstResponseAt!)));
  const res = avg(resolved.map((t) => mins(t.createdAt, t.resolvedAt!) / 60));
  const rt = avg(rated.map((t) => t.rating!));

  return {
    period,
    leave: { taken, lopDays, balances, pendingRequests },
    time: {
      workingDays,
      leaveDays,
      daysWithTime: new Set(entries.filter((t) => t.minutes > 0).map((t) => t.date)).size,
      taskHours: r1(taskHours),
      ticketHours: r1(ticketHours),
      totalHours: r1(totalHours),
      avgHoursPerDay: daysAvailable ? r1(totalHours / daysAvailable) : 0,
    },
    tasks: {
      assigned: assigned.length,
      closed: closed.length,
      onTimePct: pct(onTime.length, withDue.length),
      overdueAtMonthEnd: overdue.length,
    },
    tickets: {
      closed: resolved.length,
      avgFirstResponseMins: fr === null ? null : Math.round(fr),
      avgResolutionHours: res === null ? null : r1(res),
      slaMetPct: pct(
        slaTracked.filter((t) => Date.parse(t.resolvedAt!) <= Date.parse(t.slaDueAt!)).length,
        slaTracked.length,
      ),
      avgRating: rt === null ? null : r1(rt),
      ratings: rated.length,
    },
  };
}

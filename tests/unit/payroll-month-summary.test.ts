import { describe, expect, it } from 'vitest';
import {
  buildMonthSummary,
  calculatePayslip,
  renderPayslipHtml,
  type LeaveRequest,
} from '@coex/shared/payroll/index';
import { assignment, employee, leaveTypes, settings, structure } from './payroll-fixtures';

const lr = (o: Partial<LeaveRequest>): LeaveRequest => ({
  id: 'x',
  tenantId: 't1',
  employeeId: 'e1',
  typeCode: 'AL',
  from: '2026-11-02',
  to: '2026-11-03',
  halfDay: false,
  status: 'approved',
  ...o,
});
const sum = () =>
  buildMonthSummary({
    period: '2026-11',
    settings: settings(),
    employee: employee(),
    userId: 'u1',
    leaveTypes,
    leaveRequests: [
      lr({}),
      lr({ id: 'y', typeCode: 'UL', from: '2026-11-10', to: '2026-11-10' }),
      lr({ id: 'z', status: 'pending', from: '2026-12-01', to: '2026-12-01' }),
    ],
    timeEntries: [
      { userId: 'u1', date: '2026-11-04', minutes: 300, kind: 'task' },
      { userId: 'u1', date: '2026-11-04', minutes: 60, kind: 'ticket' },
      { userId: 'u1', date: '2026-11-05', minutes: 420, kind: 'ticket' },
      { userId: 'u2', date: '2026-11-05', minutes: 999, kind: 'task' },
      { userId: 'u1', date: '2026-10-31', minutes: 999, kind: 'task' },
    ],
    tasks: [
      {
        id: 't1',
        assigneeId: 'u1',
        createdAt: '2026-11-01T08:00:00Z',
        dueDate: '2026-11-10',
        closedAt: '2026-11-09T10:00:00Z',
      },
      {
        id: 't2',
        assigneeId: 'u1',
        createdAt: '2026-11-01T08:00:00Z',
        dueDate: '2026-11-10',
        closedAt: '2026-11-12T10:00:00Z',
      },
      { id: 't3', assigneeId: 'u1', createdAt: '2026-11-15T08:00:00Z', dueDate: '2026-11-20' },
      {
        id: 't4',
        assigneeId: 'u1',
        createdAt: '2026-10-01T08:00:00Z',
        closedAt: '2026-10-05T10:00:00Z',
      },
    ],
    tickets: [
      {
        id: 'k1',
        assigneeId: 'u1',
        createdAt: '2026-11-03T08:00:00Z',
        firstResponseAt: '2026-11-03T08:30:00Z',
        resolvedAt: '2026-11-03T12:00:00Z',
        slaDueAt: '2026-11-03T16:00:00Z',
        rating: 5,
      },
      {
        id: 'k2',
        assigneeId: 'u1',
        createdAt: '2026-11-04T08:00:00Z',
        firstResponseAt: '2026-11-04T09:30:00Z',
        resolvedAt: '2026-11-05T08:00:00Z',
        slaDueAt: '2026-11-04T16:00:00Z',
        rating: 4,
      },
    ],
  });

describe('month at a glance', () => {
  const m = sum();
  it('leave', () => {
    expect(m.leave.taken).toEqual([
      { code: 'AL', name: 'Annual', days: 2 },
      { code: 'UL', name: 'Unpaid', days: 1 },
    ]);
    expect(m.leave.lopDays).toBe(1);
    expect(m.leave.pendingRequests).toBe(1);
    expect(m.leave.balances[0]).toMatchObject({ code: 'AL', balance: 25.5 }); // 11 × 2.5 − 2
  });
  it('time logged on tasks and tickets only, in the month, for this user', () => {
    expect(m.time).toMatchObject({
      workingDays: 21,
      leaveDays: 3,
      daysWithTime: 2,
      taskHours: 5,
      ticketHours: 8,
      totalHours: 13,
    });
    expect(m.time.avgHoursPerDay).toBe(0.7); // 13 / 18
  });
  it('tasks', () =>
    expect(m.tasks).toEqual({ assigned: 3, closed: 2, onTimePct: 50, overdueAtMonthEnd: 1 }));
  it('tickets', () =>
    expect(m.tickets).toEqual({
      closed: 2,
      avgFirstResponseMins: 60,
      avgResolutionHours: 14,
      slaMetPct: 50,
      avgRating: 4.5,
      ratings: 2,
    }));
  it('employee copy has page 2; bank copy does not', () => {
    const base = {
      payslip: calculatePayslip({
        settings: settings(),
        period: '2026-11',
        employee: employee(),
        structure,
        assignment,
        leaveTypes,
        leaveRequests: [],
        loans: [],
        reimbursements: [],
      })!,
      runStatus: 'paid' as const,
      runRef: 'PAY-2026-11',
      summary: m,
      employee: {
        code: '001',
        name: 'Test',
        joinDate: '2025-01-01',
        paymentMethod: 'bank' as const,
      },
      branding: { companyName: 'DIGISOL LLC FZ', addressLines: [] },
    };
    expect(renderPayslipHtml(base)).toContain('Month at a glance');
    const bank = renderPayslipHtml({ ...base, copy: 'bank' });
    expect(bank).not.toContain('Month at a glance');
    expect(bank).toContain('Bank copy');
  });
});

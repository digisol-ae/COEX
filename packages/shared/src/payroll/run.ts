// Payroll run lifecycle: draft -> calculated -> approved -> paid -> locked (or cancelled).
// Maker-checker: the approver must be a different user from the one who calculated.
import type { Payslip } from './engine';
import type { RunStatus } from './schemas';

export type PayrollRole = 'hr' | 'payroll_officer' | 'payroll_approver' | 'accounts' | 'admin';
export type RunAction = 'calculate' | 'approve' | 'reopen' | 'mark_paid' | 'lock' | 'cancel';

export type PayrollRun = {
  id: string;
  tenantId: string;
  period: string;
  currency: string;
  status: RunStatus;
  payslips: Payslip[];
  calculatedBy?: string;
  calculatedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  /** Individual approvals; run becomes "approved" when requiredApprovals is reached */
  approvals?: { userId: string; at: string }[];
  paidBy?: string;
  paidAt?: string;
  paymentRef?: string;
  events: {
    action: RunAction;
    actor: string;
    at: string;
    from: RunStatus;
    to: RunStatus;
    reason?: string;
  }[];
};

const RULES: Record<
  RunAction,
  { from: RunStatus[]; to: RunStatus; roles: PayrollRole[]; needsReason?: boolean }
> = {
  calculate: {
    from: ['draft', 'calculated'],
    to: 'calculated',
    roles: ['payroll_officer', 'hr', 'admin'],
  },
  approve: { from: ['calculated'], to: 'approved', roles: ['payroll_approver', 'admin'] },
  reopen: {
    from: ['approved'],
    to: 'calculated',
    roles: ['payroll_approver', 'admin'],
    needsReason: true,
  },
  mark_paid: { from: ['approved'], to: 'paid', roles: ['accounts', 'admin'] },
  lock: { from: ['paid'], to: 'locked', roles: ['accounts', 'admin'] },
  cancel: {
    from: ['draft', 'calculated'],
    to: 'cancelled',
    roles: ['payroll_officer', 'admin'],
    needsReason: true,
  },
};

export class TransitionError extends Error {
  constructor(
    public code: 'invalid_state' | 'forbidden' | 'same_user' | 'reason_required' | 'blocked',
    msg: string,
  ) {
    super(msg);
  }
}

export type ApprovalPolicy = { approverUserIds: string[]; requiredApprovals: 1 | 2 };

export function canTransition(
  run: PayrollRun,
  action: RunAction,
  actor: { id: string; roles: PayrollRole[] },
  reason?: string,
  policy?: ApprovalPolicy,
) {
  const r = RULES[action];
  if (!r.from.includes(run.status))
    throw new TransitionError('invalid_state', `Cannot ${action} a ${run.status} run`);
  if (!actor.roles.some((x) => r.roles.includes(x)))
    throw new TransitionError('forbidden', `Role not allowed to ${action}`);
  if (r.needsReason && (!reason || reason.trim().length < 10))
    throw new TransitionError('reason_required', 'Reason (min 10 characters) is required');
  if (action === 'approve') {
    if (run.calculatedBy === actor.id && !actor.roles.includes('admin'))
      throw new TransitionError('same_user', 'Approver must be different from the preparer');
    if (policy?.approverUserIds.length && !policy.approverUserIds.includes(actor.id))
      throw new TransitionError('forbidden', 'You are not a named payroll approver');
    if (run.approvals?.some((a) => a.userId === actor.id))
      throw new TransitionError('same_user', 'You have already approved this run');
    const pending = run.payslips.reduce((a, p) => a + (p.pendingApprovals ?? 0), 0);
    if (pending)
      throw new TransitionError(
        'blocked',
        `${pending} addition/deduction item(s) still need approval`,
      );
    const blocking = run.payslips.filter((p) => p.net < 0);
    if (blocking.length)
      throw new TransitionError('blocked', `${blocking.length} payslip(s) have negative net pay`);
  }
  return r.to;
}

/** Apply a transition, returning a new run object (caller persists it). */
export function transition(
  run: PayrollRun,
  action: RunAction,
  actor: { id: string; roles: PayrollRole[] },
  opts: {
    reason?: string;
    payslips?: Payslip[];
    paymentRef?: string;
    now?: string;
    policy?: ApprovalPolicy;
  } = {},
): PayrollRun {
  let to = canTransition(run, action, actor, opts.reason, opts.policy);
  const at = opts.now ?? new Date().toISOString();
  if (action === 'approve') {
    const approvals = [...(run.approvals ?? []), { userId: actor.id, at }];
    const needed = opts.policy?.requiredApprovals ?? 1;
    if (approvals.length < needed) {
      // First of two approvals: stays "calculated" until the second approver signs off
      return {
        ...run,
        approvals,
        events: [
          ...run.events,
          {
            action,
            actor: actor.id,
            at,
            from: run.status,
            to: run.status,
            reason: `Approval ${approvals.length} of ${needed}`,
          },
        ],
      };
    }
    to = 'approved';
    run = { ...run, approvals };
  }
  const next: PayrollRun = {
    ...run,
    status: to,
    events: [
      ...run.events,
      { action, actor: actor.id, at, from: run.status, to, reason: opts.reason },
    ],
  };
  if (action === 'calculate')
    Object.assign(next, {
      payslips: opts.payslips ?? run.payslips,
      calculatedBy: actor.id,
      calculatedAt: at,
      approvedBy: undefined,
      approvedAt: undefined,
      approvals: [],
    });
  if (action === 'approve') Object.assign(next, { approvedBy: actor.id, approvedAt: at });
  if (action === 'reopen')
    Object.assign(next, { approvedBy: undefined, approvedAt: undefined, approvals: [] });
  if (action === 'mark_paid')
    Object.assign(next, { paidBy: actor.id, paidAt: at, paymentRef: opts.paymentRef });
  return next;
}

export function runTotals(run: Pick<PayrollRun, 'payslips'>) {
  const paid = run.payslips.filter((p) => !p.hold);
  const r2 = (x: number) => Math.round(x * 100) / 100;
  return {
    employees: run.payslips.length,
    onHold: run.payslips.length - paid.length,
    gross: r2(paid.reduce((a, p) => a + p.gross, 0)),
    deductions: r2(paid.reduce((a, p) => a + p.totalDeductions, 0)),
    net: r2(paid.reduce((a, p) => a + p.net, 0)),
    warnings: run.payslips.reduce((a, p) => a + p.warnings.length, 0),
  };
}

/** DB side-effects to apply in one transaction when a run is marked paid. */
export function postingEffects(run: PayrollRun) {
  const loans = new Map<string, number>();
  const reimbursementIds: string[] = [];
  for (const p of run.payslips) {
    if (p.hold) continue;
    for (const l of p.loanRecoveries)
      loans.set(l.loanId, Math.round(((loans.get(l.loanId) ?? 0) + l.amount) * 100) / 100);
    reimbursementIds.push(...p.reimbursementIds);
  }
  return {
    loanIncrements: [...loans].map(([loanId, amount]) => ({ loanId, amount })), // $inc recovered; close when recovered >= principal
    reimbursementsPaid: reimbursementIds, // set status = "paid"
  };
}

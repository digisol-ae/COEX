// Commission: HR ⇄ CRM link (John, 27 Nov 2026)
// - Salesperson = required "Sales owner" (Worktello user) carried Lead → Opportunity → Contract.
// - Basis = contract value; earned when payment is received, in proportion to each payment.
// - Renewals: rate set manually on the renewal contract (no rate = no commission); editable.
// - Clawback: contract cancelled within settings.clawbackDays (default 90) of signing →
//   suggested deduction of commission already paid; HR confirms.
// - Auto amounts go into the run as COMMISSION items; HR can override with a reason.
import { Adjustment, type PayrollSettings } from './schemas';
import { periodBounds } from './calendar';
import { fromMinor, mulRatio, toMinor } from './money';
import { DEFAULT_CATEGORIES } from './pay-items';

export type CommissionPlan = {
  employeeId: string;
  userId: string;
  rate: number;
  effectiveFrom: string;
  active: boolean;
};
export type ContractForCommission = {
  id: string;
  number: string;
  customer: string;
  value: number;
  ownerUserId: string;
  signedAt: string;
  status: 'active' | 'customer_signed' | 'suspended' | 'terminated' | 'cancelled' | 'expired';
  cancelledAt?: string;
  isRenewal: boolean;
  /** Manual rate on the contract (required for renewals, optional override for new contracts) */
  commissionRate?: number;
};
export type PaymentReceived = {
  id: string;
  contractId: string;
  amount: number;
  receivedAt: string;
};
export type CommissionAccrual = {
  id: string;
  contractId: string;
  paymentId: string;
  userId: string;
  employeeId: string;
  period: string;
  rate: number;
  amount: number;
  status: 'pending' | 'paid' | 'clawed_back';
};

const cat = (code: string) => DEFAULT_CATEGORIES.find((c) => c.code === code)!;

function rateFor(c: ContractForCommission, plan: CommissionPlan | undefined): number | null {
  if (c.commissionRate !== undefined) return c.commissionRate;
  if (c.isRenewal) return null; // renewals are decided manually
  return plan?.active ? plan.rate : null;
}

/** New accruals for payments received in the period (idempotent on paymentId). */
export function accrueCommissions(opts: {
  period: string;
  contracts: ContractForCommission[];
  payments: PaymentReceived[];
  plans: CommissionPlan[];
  existing: CommissionAccrual[];
  newId: () => string;
}): CommissionAccrual[] {
  const { start, end } = periodBounds(opts.period);
  const done = new Set(opts.existing.map((a) => a.paymentId));
  const out: CommissionAccrual[] = [];
  for (const p of opts.payments) {
    const day = p.receivedAt.slice(0, 10);
    if (day < start || day > end || done.has(p.id)) continue;
    const c = opts.contracts.find((x) => x.id === p.contractId);
    if (!c || c.status === 'cancelled') continue;
    const plan = opts.plans.find(
      (x) => x.userId === c.ownerUserId && x.effectiveFrom <= c.signedAt.slice(0, 10),
    );
    const rate = rateFor(c, plan);
    if (!rate || !plan) continue;
    // Proportional: rate × payment, capped so total never exceeds rate × contract value
    const capM = mulRatio(toMinor(c.value), rate / 100);
    const soFarM = [...opts.existing, ...out]
      .filter((a) => a.contractId === c.id && a.status !== 'clawed_back')
      .reduce((a, x) => a + toMinor(x.amount), 0);
    const amtM = Math.min(mulRatio(toMinor(p.amount), rate / 100), Math.max(0, capM - soFarM));
    if (amtM <= 0) continue;
    out.push({
      id: opts.newId(),
      contractId: c.id,
      paymentId: p.id,
      userId: c.ownerUserId,
      employeeId: plan.employeeId,
      period: opts.period,
      rate,
      amount: fromMinor(amtM),
      status: 'pending',
    });
  }
  return out;
}

/** Turn pending accruals into run items (one per contract per employee). */
export function commissionRunItems(
  accruals: CommissionAccrual[],
  contracts: ContractForCommission[],
  s: PayrollSettings,
  employeeId: string,
): Adjustment[] {
  const mine = accruals.filter((a) => a.employeeId === employeeId && a.status === 'pending');
  const byContract = new Map<string, CommissionAccrual[]>();
  for (const a of mine) byContract.set(a.contractId, [...(byContract.get(a.contractId) ?? []), a]);
  const c0 = cat('COMMISSION');
  return [...byContract].map(([cid, list]) => {
    const c = contracts.find((x) => x.id === cid)!;
    const amount = fromMinor(list.reduce((a, x) => a + toMinor(x.amount), 0));
    return Adjustment.parse({
      code: c0.code,
      name: c0.name,
      type: 'earning',
      amount,
      glAccount: c0.glAccount,
      source: 'auto',
      note: `${c.number} ${c.customer}: ${list[0].rate}% of ${list.length} payment(s)`,
      showNote: c0.showNoteOnPayslip,
      ref: { type: 'contract', id: c.id, label: c.number },
      approval: { required: amount > s.itemApprovalLimit },
    });
  });
}

/** Suggested clawback deductions for contracts cancelled within the window during the period. */
export function clawbackSuggestions(opts: {
  period: string;
  contracts: ContractForCommission[];
  accruals: CommissionAccrual[];
  settings: PayrollSettings;
}): { employeeId: string; contractId: string; item: Adjustment; accrualIds: string[] }[] {
  const { start, end } = periodBounds(opts.period);
  const out: ReturnType<typeof clawbackSuggestions> = [];
  const c0 = cat('CLAWBACK');
  for (const c of opts.contracts) {
    if (!(c.status === 'cancelled' || c.status === 'terminated') || !c.cancelledAt) continue;
    const day = c.cancelledAt.slice(0, 10);
    if (day < start || day > end) continue;
    const days = (Date.parse(c.cancelledAt) - Date.parse(c.signedAt)) / 86_400_000;
    if (days > opts.settings.clawbackDays) continue;
    const paid = opts.accruals.filter((a) => a.contractId === c.id && a.status === 'paid');
    const byEmp = new Map<string, CommissionAccrual[]>();
    for (const a of paid) byEmp.set(a.employeeId, [...(byEmp.get(a.employeeId) ?? []), a]);
    for (const [employeeId, list] of byEmp) {
      const amount = fromMinor(list.reduce((a, x) => a + toMinor(x.amount), 0));
      out.push({
        employeeId,
        contractId: c.id,
        accrualIds: list.map((a) => a.id),
        item: Adjustment.parse({
          code: c0.code,
          name: c0.name,
          type: 'deduction',
          amount,
          glAccount: c0.glAccount,
          source: 'auto',
          note: `${c.number} cancelled ${Math.round(days)} days after signing`,
          showNote: true,
          ref: { type: 'contract', id: c.id, label: c.number },
          approval: { required: amount > opts.settings.itemApprovalLimit },
        }),
      });
    }
  }
  return out;
}

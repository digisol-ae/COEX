// Payslip HTML (print-ready A4). Based on DigiSol's original payslip (July 2025),
// with fixes: amounts and YTD in their own columns, totals filled, pay period dates,
// paid/LOP days from the engine, reimbursements separated, amount in words with fils,
// stamp/signature only on approved runs (DRAFT watermark otherwise).
// Server converts to PDF with the same pipeline as Contracts (Gotenberg / headless Chrome).
import type { Payslip, PayslipLine } from './engine';
import { periodBounds } from './calendar';
import type { MonthSummary } from './month-summary';

export type PayslipBranding = {
  companyName: string; // "DIGISOL LLC FZ"
  addressLines: string[]; // ["Meydan Grandstand, 6th Floor, Meydan Road", "Dubai, UAE"]
  logoDataUrl?: string;
  stampDataUrl?: string; // uploaded in Payroll settings
  signatureDataUrl?: string; // uploaded in Payroll settings
  signatoryName?: string; // printed under signature
  accent?: string; // default DigiSol red #ee3d51 (used sparingly)
};

export type PayslipDocInput = {
  payslip: Payslip;
  employee: {
    code: string;
    name: string;
    designation?: string;
    department?: string;
    joinDate: string;
    paymentMethod: 'bank' | 'cash' | 'cheque';
    bankName?: string;
    accountLast4?: string;
  };
  payDate?: string; // ISO; blank until paid
  runStatus: 'draft' | 'calculated' | 'approved' | 'paid' | 'locked' | 'cancelled';
  runRef: string; // e.g. "PAY-2025-07"
  /** Year-to-date totals by line code (including this month). Use ytdTotals(). */
  ytd?: Record<string, number>;
  branding: PayslipBranding;
  /** Page 2 "Month at a glance" (employee copy only) */
  summary?: MonthSummary;
  /** employee = page 1 + page 2; bank = page 1 only (for banks, visas, landlords) */
  copy?: 'employee' | 'bank';
};

const CUR_WORDS: Record<string, [string, string]> = {
  AED: ['Dirhams', 'Fils'],
  PKR: ['Rupees', 'Paisa'],
  USD: ['Dollars', 'Cents'],
};
const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function under1000(n: number): string {
  const h = Math.floor(n / 100),
    r = n % 100;
  const rest = r < 20 ? ONES[r] : `${TENS[Math.floor(r / 10)]}${r % 10 ? ' ' + ONES[r % 10] : ''}`;
  return [h ? `${ONES[h]} Hundred` : '', rest].filter(Boolean).join(' ');
}
export function intToWords(n: number): string {
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  for (const [v, w] of [
    [1e9, 'Billion'],
    [1e6, 'Million'],
    [1e3, 'Thousand'],
    [1, ''],
  ] as const) {
    const q = Math.floor(n / v);
    n %= v;
    if (q) parts.push(`${under1000(q)}${w ? ' ' + w : ''}`);
  }
  return parts.join(' ');
}
export function amountInWords(amount: number, currency: string): string {
  const [major, minor] = CUR_WORDS[currency] ?? [currency, 'cents'];
  const m = Math.round(Math.abs(amount) * 100),
    whole = Math.floor(m / 100),
    frac = m % 100;
  return `${intToWords(whole)} ${major}${frac ? ` and ${intToWords(frac)} ${minor}` : ''} Only`;
}

/** Sum line amounts by code across payslips of the same calendar year (pass locked/paid ones + current). */
export function ytdTotals(payslips: Payslip[]): Record<string, number> {
  const t: Record<string, number> = {};
  const add = (k: string, v: number) => (t[k] = Math.round(((t[k] ?? 0) + v) * 100) / 100);
  for (const p of payslips) {
    for (const l of p.lines) add(`${l.type}:${l.code}`, l.amount);
    add('GROSS', p.gross);
    add(
      'SALARY_GROSS',
      p.gross -
        p.lines.filter((l) => l.source === 'reimbursement').reduce((a, l) => a + l.amount, 0),
    );
    add('DEDUCTIONS', p.totalDeductions);
    add('NET', p.net);
  }
  return t;
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const money = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dmy = (iso?: string) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m - 1]} ${y}`;
};
const monthName = (period: string) =>
  new Date(`${period}-01T00:00:00Z`).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

export function renderPayslipHtml(d: PayslipDocInput): string {
  const { payslip: p, employee: e, branding: b } = d;
  const accent = b.accent ?? '#ee3d51';
  const final = ['approved', 'paid', 'locked'].includes(d.runStatus);
  const { start, end } = periodBounds(p.period);
  const ytd = d.ytd ?? {};
  const salary = p.lines.filter((l) => l.type === 'earning' && l.source !== 'reimbursement');
  const reimb = p.lines.filter((l) => l.source === 'reimbursement');
  const deds = p.lines.filter((l) => l.type === 'deduction');
  const row = (l: PayslipLine | undefined) =>
    l
      ? `<td>${esc(l.name)}${l.note ? `<div class="note">${esc(l.note)}</div>` : ''}</td><td class="n">${money(l.amount)}</td><td class="n muted">${ytd[`${l.type}:${l.code}`] !== undefined ? money(ytd[`${l.type}:${l.code}`]) : ''}</td>`
      : `<td></td><td></td><td></td>`;
  const n = Math.max(salary.length, deds.length, 1);
  const rows = Array.from(
    { length: n },
    (_, i) => `<tr>${row(salary[i])}${row(deds[i])}</tr>`,
  ).join('');
  const reimbRows = reimb
    .map(
      (l) =>
        `<tr><td>${esc(l.name)}</td><td class="n">${money(l.amount)}</td><td class="n muted"></td><td colspan="3"></td></tr>`,
    )
    .join('');
  const reimbTotal = reimb.reduce((a, l) => a + l.amount, 0);
  const salaryGross = Math.round((p.gross - reimbTotal) * 100) / 100;
  const pay =
    e.paymentMethod === 'bank'
      ? `Bank transfer${e.bankName ? ` · ${esc(e.bankName)}` : ''}${e.accountLast4 ? ` ····${esc(e.accountLast4)}` : ''}`
      : e.paymentMethod === 'cash'
        ? 'Cash'
        : 'Cheque';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payslip ${esc(e.code)} ${p.period}</title>
<style>
@page{size:A4;margin:14mm}
*{box-sizing:border-box}body{font-family:Poppins,"Segoe UI",Arial,sans-serif;color:#141414;font-size:11px;margin:0}
.sheet{border:1px solid #bfbfbf;border-radius:6px;overflow:hidden;position:relative}
.head{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:3px solid ${accent}}
.head h1{font-size:18px;margin:0 0 4px;font-weight:600;letter-spacing:.3px}.head .addr{color:#555;line-height:1.5}
.logo{width:74px;height:74px;object-fit:contain;border-radius:4px}
.title{text-align:center;padding:8px;font-weight:600;background:#f6f6f6;border-bottom:1px solid #e3e3e3}
.sum{display:grid;grid-template-columns:1.4fr 1fr;border-bottom:1px solid #e3e3e3}
.sum table td{padding:4px 20px}.sum table td:first-child{color:#666;width:140px;white-space:nowrap}
.netbox{border-left:1px solid #e3e3e3;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:4px;padding:12px}
.netbox .lbl{color:#666}.netbox .amt{font-size:24px;font-weight:700}.netbox .days{color:#444}
table{width:100%;border-collapse:collapse}
.lines th{background:#f6f6f6;text-align:left;padding:6px 10px;font-weight:600;border-bottom:1px solid #e3e3e3;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px}
.lines td{padding:5px 10px;border-bottom:1px solid #f0f0f0;vertical-align:top}
.lines th:nth-child(3),.lines td:nth-child(3){border-right:1px solid #e3e3e3}
.n{text-align:right;white-space:nowrap}.muted{color:#777}.note{color:#777;font-size:9.5px}
.tot td{font-weight:600;background:#fafafa;border-top:1px solid #e3e3e3}
.sub td{font-weight:600;color:#555;background:#fcfcfc}
.net{display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-top:1px solid #e3e3e3}
.net .calc{color:#555;line-height:1.7}.net .big{font-size:16px;font-weight:700}
.words{padding:8px 20px;border-top:1px solid #e3e3e3;background:#f6f6f6}
.sign{display:flex;justify-content:space-between;align-items:flex-end;padding:12px 20px;min-height:110px;border-top:1px solid #e3e3e3}
.sign img.stamp{height:96px}.sign img.sig{height:64px;margin-left:-20px}
.sign .by{color:#555;font-size:10px}.foot{color:#888;font-size:9px;text-align:right}
.page2{page-break-before:always;break-before:page;margin-top:0}
.p2h{display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-bottom:3px solid ${accent}}
.p2h h2{font-size:15px;margin:0;font-weight:600}.p2h .who{color:#555;text-align:right}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:14px 20px}
.card{border:1px solid #e3e3e3;border-radius:6px;padding:10px 12px}
.card h3{font-size:11px;text-transform:uppercase;letter-spacing:.4px;margin:0 0 8px;color:#444}
.kv{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dashed #eee}.kv:last-child{border-bottom:0}
.kv span:first-child{color:#666}.kv span:last-child{font-weight:600}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:14px 20px 0}
.stat{background:#f6f6f6;border-radius:6px;padding:10px;text-align:center}.stat b{display:block;font-size:18px}.stat span{color:#666;font-size:10px}
.soon{color:#888;font-style:italic}
.copy{position:absolute;top:8px;right:110px;font-size:9px;color:#888;letter-spacing:.5px;text-transform:uppercase}
.wm{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:110px;color:rgba(238,61,81,.08);font-weight:700;transform:rotate(-25deg);pointer-events:none}
</style></head><body><div class="sheet">
${d.copy === 'bank' ? `<div class="copy">Bank copy</div>` : ''}
${final ? '' : `<div class="wm">DRAFT</div>`}
<div class="head"><div><h1>${esc(b.companyName)}</h1><div class="addr">${b.addressLines.map(esc).join('<br>')}</div></div>
${b.logoDataUrl ? `<img class="logo" src="${b.logoDataUrl}" alt="">` : ''}</div>
<div class="title">Payslip for the month of ${monthName(p.period)}</div>
<div class="sum"><table>
<tr><td>Employee name</td><td><b>${esc(e.name)}</b></td></tr>
<tr><td>Employee code</td><td>${esc(e.code)}</td></tr>
<tr><td>Designation</td><td>${esc(e.designation ?? '—')}${e.department ? ` · ${esc(e.department)}` : ''}</td></tr>
<tr><td>Date of joining</td><td>${dmy(e.joinDate)}</td></tr>
<tr><td>Pay period</td><td>${dmy(start)} – ${dmy(end)}</td></tr>
<tr><td>Pay date</td><td>${dmy(d.payDate)}</td></tr>
<tr><td>Mode of payment</td><td>${pay}</td></tr>
</table>
<div class="netbox"><div class="lbl">Employee net pay</div><div class="amt">${esc(p.currency)} ${money(p.net)}</div>
<div class="days">Paid days: ${p.payableDays} of ${p.basisDays} | LOP days: ${p.unpaidDays}</div></div></div>
<table class="lines"><thead><tr><th>Earnings</th><th class="n">Amount</th><th class="n">YTD</th><th>Deductions</th><th class="n">Amount</th><th class="n">YTD</th></tr></thead>
<tbody>${rows}
<tr class="tot"><td>Gross earnings</td><td class="n">${money(salaryGross)}</td><td class="n muted">${ytd.SALARY_GROSS !== undefined ? money(ytd.SALARY_GROSS) : ''}</td><td>Total deductions</td><td class="n">${money(p.totalDeductions)}</td><td class="n muted">${ytd.DEDUCTIONS !== undefined ? money(ytd.DEDUCTIONS) : ''}</td></tr>
${reimb.length ? `<tr class="sub"><td colspan="6">Reimbursements</td></tr>${reimbRows}<tr class="tot"><td>Total reimbursements</td><td class="n">${money(reimbTotal)}</td><td></td><td colspan="3"></td></tr>` : ''}
</tbody></table>
<div class="net"><div class="calc">Gross earnings ${money(salaryGross)}${reimb.length ? ` + Reimbursements ${money(reimbTotal)}` : ''} − Deductions ${money(p.totalDeductions)}</div>
<div class="big">Net payable: ${esc(p.currency)} ${money(p.net)}</div></div>
<div class="words"><b>Amount in words:</b> ${amountInWords(p.net, p.currency)}</div>
<div class="sign"><div>${final && b.stampDataUrl ? `<img class="stamp" src="${b.stampDataUrl}" alt="">` : ''}${final && b.signatureDataUrl ? `<img class="sig" src="${b.signatureDataUrl}" alt="">` : ''}
<div class="by">${final ? `Authorised signatory${b.signatoryName ? `: ${esc(b.signatoryName)}` : ''}` : 'Not valid until approved'}</div></div>
<div class="foot">Ref ${esc(d.runRef)} · System-generated by Worktello<br>Queries: contact HR within 7 days of the pay date</div></div>
</div>${d.copy !== 'bank' && d.summary ? renderPage2(d) : ''}</body></html>`;
}

const hm = (h: number) => `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2, '0')}m`;
const kv = (k: string, v: string | number) =>
  `<div class="kv"><span>${esc(k)}</span><span>${esc(String(v))}</span></div>`;
const orDash = (v: number | null, suffix = '') => (v === null ? '—' : `${v}${suffix}`);

function renderPage2(d: PayslipDocInput): string {
  const m = d.summary!,
    t = m.time,
    k = m.tasks,
    q = m.tickets,
    l = m.leave;
  const frm =
    q.avgFirstResponseMins === null
      ? '—'
      : q.avgFirstResponseMins >= 60
        ? hm(q.avgFirstResponseMins / 60)
        : `${q.avgFirstResponseMins} min`;
  return `<div class="sheet page2">
<div class="p2h"><h2>Month at a glance · ${monthName(m.period)}</h2><div class="who"><b>${esc(d.employee.name)}</b><br>${esc(d.employee.code)}${d.employee.designation ? ` · ${esc(d.employee.designation)}` : ''}</div></div>
<div class="stats">
<div class="stat"><b>${hm(t.totalHours)}</b><span>Hours logged</span></div>
<div class="stat"><b>${hm(t.avgHoursPerDay)}</b><span>Average per working day</span></div>
<div class="stat"><b>${k.closed}</b><span>Tasks closed</span></div>
<div class="stat"><b>${q.closed}</b><span>Tickets closed</span></div>
</div>
<div class="grid">
<div class="card"><h3>Time logged</h3>
${kv('Working days', t.workingDays)}${kv('Leave days', t.leaveDays)}${kv('Days with time logged', t.daysWithTime)}
${kv('On tasks', hm(t.taskHours))}${kv('On tickets', hm(t.ticketHours))}${kv('Average per working day', hm(t.avgHoursPerDay))}</div>
<div class="card"><h3>Leave</h3>
${l.taken.length ? l.taken.map((x) => kv(`${x.name} taken`, `${x.days} d`)).join('') : kv('Leave taken', 'None')}
${kv('Unpaid (LOP) days', l.lopDays)}
${l.balances.map((b) => kv(`${b.name} balance`, `${b.balance} d`)).join('')}
${kv('Pending requests', l.pendingRequests)}</div>
<div class="card"><h3>Tasks</h3>
${kv('Assigned during month', k.assigned)}${kv('Closed', k.closed)}${kv('Closed on time', orDash(k.onTimePct, '%'))}${kv('Overdue at month end', k.overdueAtMonthEnd)}</div>
<div class="card"><h3>Support tickets</h3>
${kv('Closed', q.closed)}${kv('Average first response', frm)}${kv('Average resolution', q.avgResolutionHours === null ? '—' : hm(q.avgResolutionHours))}
${kv('SLA met', orDash(q.slaMetPct, '%'))}${kv('Customer rating', q.avgRating === null ? '—' : `${q.avgRating} / 5 (${q.ratings})`)}</div>
<div class="card" style="grid-column:1 / -1"><h3>Scorecard &amp; recognition</h3>
<div class="soon">Work score, behaviour score, awards and kudos will appear here when scorecards go live.</div></div>
</div>
<div class="foot" style="padding:0 20px 12px">Employee copy · Page 2 is for the employee only and is not part of the bank copy · Ref ${esc(d.runRef)}</div>
</div>`;
}

import Link from 'next/link';
import { requireStaffUser } from '@/lib/session';
export default async function PayrollLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireStaffUser();
  const all = actor.permissions.includes('payroll.read.all');
  const links = all
    ? [
        ['', 'Overview'],
        ['employees', 'Employees'],
        ['assignments', 'Salary history'],
        ['structures', 'Structures'],
        ['runs', 'Runs'],
        ['leave', 'Leave'],
        ['loans', 'Loans'],
        ['reimbursements', 'Expenses'],
        ['categories', 'Pay items'],
        ['recurring', 'Recurring pay'],
        ['commissions', 'Commissions'],
        ['reports', 'Reports'],
        ['import', 'Import'],
        ['settings', 'Settings'],
      ]
    : [];
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <nav
        aria-label="Payroll"
        className="flex flex-wrap gap-2 border-b border-[var(--color-line)] pb-3"
      >
        {links.map(([path, label]) => (
          <Link
            key={path}
            href={`/payroll${path ? `/${path}` : ''}`}
            className="rounded-lg px-3 py-2 text-sm hover:bg-[var(--color-surface-soft)]"
          >
            {label}
          </Link>
        ))}
        {actor.permissions.includes('payroll.read.own') && (
          <Link className="rounded-lg px-3 py-2 text-sm" href="/payroll/my-pay">
            My pay
          </Link>
        )}
      </nav>
      {children}
    </div>
  );
}

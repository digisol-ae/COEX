import { payrollResponse, privateHeaders } from '@/modules/payroll/http';
import { listPayroll } from '@/modules/payroll/services/payroll.service';
export async function GET(_request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  return payrollResponse(async () => {
    const path = (await params).path ?? [];
    if (path.length === 1 && ['employees', 'runs'].includes(path[0]))
      return Response.json(
        { data: await listPayroll(path[0] === 'employees' ? 'employee' : 'run') },
        { headers: privateHeaders },
      );
    if (path.length === 3 && path[0] === 'runs' && path[2] === 'payslips') {
      const run = (await listPayroll('run')).find((r) => r.id === path[1]);
      if (run) return Response.json({ data: run.payslips }, { headers: privateHeaders });
    }
    return Response.json({ error: 'Not found.' }, { status: 404, headers: privateHeaders });
  });
}

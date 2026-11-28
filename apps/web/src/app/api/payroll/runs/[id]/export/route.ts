import { payrollResponse, privateHeaders } from '@/modules/payroll/http';
import { exportRun } from '@/modules/payroll/services/payroll.service';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return payrollResponse(async () => {
    const { id } = await params;
    const format = new URL(request.url).searchParams.get('format');
    if (!['bank', 'register', 'journal'].includes(format ?? ''))
      return Response.json(
        { error: 'Unknown export format.' },
        { status: 400, headers: privateHeaders },
      );
    return new Response(await exportRun(id, format as 'bank' | 'register' | 'journal'), {
      headers: {
        ...privateHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="payroll-${format}.csv"`,
      },
    });
  });
}

import { payrollResponse, privateHeaders } from '@/modules/payroll/http';
import { payslipPdf } from '@/modules/payroll/services/files.service';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return payrollResponse(async () => {
    const { id } = await params;
    const query = new URL(request.url).searchParams;
    const body = await payslipPdf(
      id,
      query.get('employeeId') ?? '',
      query.get('own') === 'true',
      query.get('bank') === 'true',
    );
    return new Response(new Uint8Array(body), {
      headers: {
        ...privateHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="payslip.pdf"',
      },
    });
  });
}

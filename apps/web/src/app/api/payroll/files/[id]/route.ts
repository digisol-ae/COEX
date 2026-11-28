import { payrollResponse, privateHeaders } from '@/modules/payroll/http';
import { getPayrollFile } from '@/modules/payroll/services/files.service';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return payrollResponse(async () => {
    const file = await getPayrollFile((await params).id);
    return new Response(new Uint8Array(file.body), {
      headers: {
        ...privateHeaders,
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file.name}"`,
      },
    });
  });
}

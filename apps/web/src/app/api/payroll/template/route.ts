import { payrollResponse, privateHeaders } from '@/modules/payroll/http';
import { payrollTemplate } from '@/modules/payroll/workbook';
import { requirePayroll } from '@/modules/payroll/services/payroll.service';
export async function GET() {
  return payrollResponse(async () => {
    await requirePayroll('payroll.manage');
    return new Response(new Uint8Array(await payrollTemplate()), {
      headers: {
        ...privateHeaders,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="payroll-import.xlsx"',
      },
    });
  });
}

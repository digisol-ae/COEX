import { asUser, getSignedInUser } from '@/lib/session';
import { todayKey } from '@/modules/crm/contract-status';
import { parseActivityParams } from '@/modules/time/activity-filter';
import { buildReportFor } from '@/modules/time/services/activity-share.service';

/** The Team activity page as a PDF download, with the filters carried in the address. */
export async function GET(request: Request) {
  const user = await getSignedInUser();
  if (!user) return new Response('Sign in first.', { status: 401 });
  if (!user.permissions.includes('timesheet.read.all')) {
    return new Response("You may not see everyone's activity.", { status: 403 });
  }

  const url = new URL(request.url);
  const params: Record<string, string[]> = {};
  for (const [key, value] of url.searchParams) (params[key] ??= []).push(value);

  const filter = parseActivityParams(params, todayKey());
  const report = await asUser(user, () => buildReportFor(filter));

  return new Response(new Uint8Array(report.bytes), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${report.fileName}"`,
      'cache-control': 'no-store',
    },
  });
}

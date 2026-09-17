import { asUser, getSignedInUser } from '@/lib/session';
import { totalsCsv } from '@/modules/time/services/export.service';

/** The time report as CSV. Only someone who can see all tasks may export the whole tenant. */
export async function GET(request: Request) {
  const user = await getSignedInUser();

  if (!user) {
    return new Response('Sign in first.', { status: 401 });
  }

  if (!user.permissions.includes('task.read.all')) {
    return new Response('You may not export the whole tenant.', { status: 403 });
  }

  const url = new URL(request.url);
  const from = new Date(url.searchParams.get('from') ?? '');
  const to = new Date(url.searchParams.get('to') ?? '');

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return new Response('Give a from and a to date.', { status: 400 });
  }

  to.setHours(23, 59, 59, 999);

  const csv = await asUser(user, () => totalsCsv(from, to));

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="time-${from.toISOString().slice(0, 10)}-to-${to
        .toISOString()
        .slice(0, 10)}.csv"`,
      'cache-control': 'no-store',
    },
  });
}

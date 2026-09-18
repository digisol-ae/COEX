import { asUser, getSignedInUser } from '@/lib/session';
import { timesheetCsv } from '@/modules/time/services/export.service';
import { toDateKey } from '@/modules/time/week';

/**
 * Downloads a week as CSV.
 *
 * A route rather than a server action, because a download needs real headers. Anyone may export
 * their own week; only someone who can see all tasks may export another person's.
 */
export async function GET(request: Request) {
  const user = await getSignedInUser();

  if (!user) {
    return new Response('Sign in first.', { status: 401 });
  }

  const url = new URL(request.url);
  const week = url.searchParams.get('week');
  const subject = url.searchParams.get('user') ?? user.id;

  if (subject !== user.id && !user.permissions.includes('task.read.all')) {
    return new Response('You may only export your own timesheet.', { status: 403 });
  }

  const weekDate = week ? new Date(week) : new Date();

  if (Number.isNaN(weekDate.getTime())) {
    return new Response('That week is not a date.', { status: 400 });
  }

  const csv = await asUser(user, () => timesheetCsv(weekDate, subject));
  const fileName = `timesheet-${toDateKey(weekDate)}.csv`;

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${fileName}"`,
      // A timesheet changes as the week goes on, so nothing should cache it.
      'cache-control': 'no-store',
    },
  });
}

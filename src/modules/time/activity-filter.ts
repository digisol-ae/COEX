import type { ActivityFilter } from './services/activity.service';

/**
 * The Team activity filters as they travel in the address bar, in one place so the page, the PDF
 * download and the email all read them the same way.
 */

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[0-9a-f]{24}$/i;

type Params = Record<string, string | string[] | undefined>;

const list = (value: string | string[] | undefined): string[] =>
  (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean);

export function parseActivityParams(params: Params, today: string): ActivityFilter {
  const first = (value: string | string[] | undefined) => list(value)[0];

  const from = first(params.from);
  const to = first(params.to);
  const fromDay = from && DAY.test(from) ? from : today;
  const toDay = to && DAY.test(to) ? to : fromDay;

  // Checkboxes: a form with neither box ticked sends nothing, which would otherwise read as
  // "show nothing". The page always sends `shown=1` with the boxes, so that case is told apart.
  const kinds = list(params.kind).filter(
    (kind): kind is 'task' | 'ticket' => kind === 'task' || kind === 'ticket',
  );
  const submitted = Boolean(first(params.shown));

  return {
    fromDay: fromDay <= toDay ? fromDay : toDay,
    toDay: fromDay <= toDay ? toDay : fromDay,
    userIds: list(params.person).filter((id) => ID.test(id)),
    status: first(params.status) || undefined,
    kinds: submitted ? kinds : ['task', 'ticket'],
  };
}

/** The same filters as an address query, for links that keep them. */
export function activityQuery(filter: ActivityFilter): string {
  const query = new URLSearchParams({ from: filter.fromDay, to: filter.toDay, shown: '1' });
  if (filter.status) query.set('status', filter.status);
  for (const id of filter.userIds ?? []) query.append('person', id);
  for (const kind of filter.kinds ?? ['task', 'ticket']) query.append('kind', kind);
  return query.toString();
}

/** An office date key (YYYY-MM-DD) as a day; noon keeps it on the same day in any time zone. */
export function formatDeskDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

/** Elapsed recorded work, not proof that someone is online or at their keyboard. */
export function sinceLastActive(at: Date | null, running = false, now = new Date()): string {
  if (running) return 'Working now';
  if (!at || !Number.isFinite(at.getTime())) return 'No recorded activity';
  const minutes = Math.max(0, Math.floor((now.getTime() - at.getTime()) / 60000));
  if (minutes < 1) return 'Less than a minute ago';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const remainder = minutes % 60;
  return (
    [days ? `${days}d` : '', hours ? `${hours}h` : '', remainder ? `${remainder}m` : '']
      .filter(Boolean)
      .slice(0, 2)
      .join(' ') + ' ago'
  );
}

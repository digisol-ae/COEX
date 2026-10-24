/** Tokens stay in memory for this request; never put them in URLs, storage or logs. */
export async function teamsTabRequest<T>(
  action: string,
  data?: Record<string, unknown>,
): Promise<T> {
  const teams = await import('@microsoft/teams-js');
  let token: string;
  try {
    token = await teams.authentication.getAuthToken();
  } catch {
    throw new Error(
      'Microsoft sign-in for Worktello is unavailable. Reopen Worktello in Teams; if this continues, ask your administrator to check Teams access.',
    );
  }
  const response = await fetch(`/api/integrations/teams/app${data ? '' : '?' + action}`, {
    method: data ? 'POST' : 'GET',
    cache: 'no-store',
    credentials: 'omit',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(data ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(data ? { body: JSON.stringify({ ...data, action }) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Unable to load Worktello. Try again.');
  return result as T;
}

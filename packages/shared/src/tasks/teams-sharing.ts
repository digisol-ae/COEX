/** Source links are navigation only; they never grant chat or COEX access. */
export function teamsMessageLink(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !['teams.microsoft.com', 'teams.cloud.microsoft'].includes(url.hostname) ||
      !/^\/l\/(message|chat)\//.test(url.pathname)
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

export function taskTeamsSource(source?: string | null, description?: string | null) {
  const legacy = description?.match(/^Original Teams message: (https:\/\/\S+)\s*$/m)?.[1];
  return teamsMessageLink(source) ?? teamsMessageLink(legacy);
}

export function taskShareMessage(task: { number: string; title: string; status: string }) {
  return `${task.number} · ${task.title}\nStatus: ${task.status}`;
}

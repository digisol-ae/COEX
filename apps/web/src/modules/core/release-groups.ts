/** One continuous date heading, even when that day's topics came from separate pushes. */
export function releaseDateKey(date: string): string {
  return date.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function groupReleaseTopicsByDate<T>(topics: T[], dateOf: (topic: T) => string) {
  const groups = new Map<string, { date: string; topics: T[] }>();
  for (const topic of topics) {
    const date = dateOf(topic).trim().replace(/\s+/g, ' ');
    const key = releaseDateKey(date);
    const group = groups.get(key);
    if (group) group.topics.push(topic);
    else groups.set(key, { date, topics: [topic] });
  }
  return [...groups.values()];
}

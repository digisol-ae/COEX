import { expect, it } from 'vitest';
import { groupReleaseTopicsByDate } from '@/modules/core/release-groups';

it('collects all pushes on one day under one date, preserving topic order and source records', () => {
  const topics = [
    { id: 'a', date: '26 October 2026' },
    { id: 'b', date: '25 October 2026' },
    { id: 'c', date: ' 26   october 2026 ' },
    { id: 'd', date: '25 October 2026' },
  ];
  const groups = groupReleaseTopicsByDate(topics, (topic) => topic.date);
  expect(
    groups.map((group) => ({ date: group.date, ids: group.topics.map((topic) => topic.id) })),
  ).toEqual([
    { date: '26 October 2026', ids: ['a', 'c'] },
    { date: '25 October 2026', ids: ['b', 'd'] },
  ]);
  expect(topics[2].date).toBe(' 26   october 2026 ');
  expect(groupReleaseTopicsByDate([], () => '')).toEqual([]);
});

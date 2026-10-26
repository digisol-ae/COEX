import { expect, it } from 'vitest';
import {
  applyReleaseCommand,
  publishedContent,
  type ReleaseContentState,
} from '@/modules/core/release-content';
const draft = {
  id: 'one',
  date: '26 October 2026',
  title: 'First topic',
  sections: [{ heading: 'Main topic', items: ['First paragraph'] }],
};
const empty: ReleaseContentState = { version: 0, entries: [] };
it('keeps new drafts and edits private until explicitly published, changing acknowledgement on publication', () => {
  const saved = applyReleaseCommand(empty, { kind: 'save', draft }, 'draft');
  expect(publishedContent(saved)).toEqual({ releases: [], latestId: null });
  const published = applyReleaseCommand(saved, { kind: 'publish', id: draft.id }, 'published');
  const edited = applyReleaseCommand(
    published,
    { kind: 'save', draft: { ...draft, title: 'Edited title' } },
    'private',
  );
  expect(publishedContent(edited)).toEqual({ releases: [draft], latestId: 'published' });
  const republished = applyReleaseCommand(
    edited,
    { kind: 'publish', id: draft.id },
    'new-publication',
  );
  expect(publishedContent(republished).releases[0].title).toBe('Edited title');
  expect(publishedContent(republished).latestId).toBe('new-publication');
  expect(empty.entries).toEqual([]);
  expect(published.entries[0].draft.title).toBe('First topic');
});
it('supports display order, unpublishing and deletion without leaking a hidden draft', () => {
  let state = applyReleaseCommand(empty, { kind: 'save', draft }, 'one');
  state = applyReleaseCommand(state, { kind: 'publish', id: 'one' }, 'one');
  state = applyReleaseCommand(state, { kind: 'save', draft: { ...draft, id: 'two' } }, 'two');
  expect(publishedContent(state).latestId).toBe('one');
  state = applyReleaseCommand(state, { kind: 'publish', id: 'two' }, 'two');
  state = applyReleaseCommand(state, { kind: 'move', id: 'two', direction: 'down' }, 'unused');
  expect(publishedContent(state).releases.map((release) => release.id)).toEqual(['one', 'two']);
  state = applyReleaseCommand(state, { kind: 'unpublish', id: 'one' }, 'unused');
  expect(publishedContent(state).latestId).toBe('two');
  state = applyReleaseCommand(state, { kind: 'delete', id: 'two' }, 'unused');
  expect(publishedContent(state).releases).toEqual([]);
  expect(state.entries[0].draft.id).toBe('one');
});
it('rejects empty content, oversized paragraphs, invalid commands and stale topic IDs', () => {
  expect(() =>
    applyReleaseCommand(empty, { kind: 'save', draft: { ...draft, title: ' ' } }, 'x'),
  ).toThrow();
  expect(() =>
    applyReleaseCommand(
      empty,
      {
        kind: 'save',
        draft: { ...draft, sections: [{ heading: 'Topic', items: ['x'.repeat(5001)] }] },
      },
      'x',
    ),
  ).toThrow();
  expect(() => applyReleaseCommand(empty, { kind: 'publish', id: 'missing' }, 'x')).toThrow(
    'no longer exists',
  );
  expect(() =>
    applyReleaseCommand(empty, { kind: 'move', id: 'one', direction: 'invalid' as 'up' }, 'x'),
  ).toThrow();
});

it('moves topics only within the same date, leaving other days in place', () => {
  const otherDay = { ...draft, id: 'other-day', date: '25 October 2026' };
  const second = { ...draft, id: 'two' };
  const state = {
    version: 1,
    entries: [draft, otherDay, second].map((topic) => ({
      draft: topic,
      published: topic,
      revision: topic.id,
    })),
  };
  const result = applyReleaseCommand(state, { kind: 'move', id: 'two', direction: 'up' }, 'unused');
  expect(result.entries.map((entry) => entry.draft.id)).toEqual(['two', 'other-day', 'one']);
  expect(
    applyReleaseCommand(result, { kind: 'move', id: 'two', direction: 'up' }, 'unused').entries,
  ).toEqual(result.entries);
});

it('publishes one main topic without publishing other drafts on the same date', () => {
  let state = applyReleaseCommand(empty, { kind: 'save', draft }, 'one');
  state = applyReleaseCommand(
    state,
    { kind: 'save', draft: { ...draft, id: 'two', title: 'Second topic' } },
    'two',
  );
  state = applyReleaseCommand(state, { kind: 'publish', id: 'one' }, 'published-one');
  expect(publishedContent(state).releases.map((topic) => topic.id)).toEqual(['one']);
  expect(state.entries.find((entry) => entry.draft.id === 'two')?.published).toBeNull();
});

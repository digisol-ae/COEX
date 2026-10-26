import { z } from 'zod';
import { releaseDateKey } from './release-groups';
import type { ReleaseNote } from './release-notes';

const text = (max: number) => z.string().trim().min(1).max(max);
export const releaseDraftSchema = z.object({
  id: text(100),
  date: text(60),
  title: text(200),
  sections: z
    .array(
      z.object({
        heading: text(200),
        items: z.array(text(5000)).min(1).max(50),
      }),
    )
    .min(1)
    .max(30),
});
export interface ReleaseEntry {
  draft: ReleaseNote;
  published: ReleaseNote | null;
  revision: string;
}
export interface ReleaseContentState {
  version: number;
  entries: ReleaseEntry[];
}
export type ReleaseCommand =
  | { kind: 'save'; draft: ReleaseNote }
  | { kind: 'publish' | 'unpublish' | 'delete'; id: string }
  | { kind: 'move'; id: string; direction: 'up' | 'down' };

const commandSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('save'), draft: releaseDraftSchema }),
  z.object({ kind: z.enum(['publish', 'unpublish', 'delete']), id: text(100) }),
  z.object({ kind: z.literal('move'), id: text(100), direction: z.enum(['up', 'down']) }),
]);

export function publishedContent(state: ReleaseContentState) {
  const published = state.entries.filter((entry) => entry.published);
  return {
    releases: published.map((entry) => entry.published!),
    latestId: published[0] ? published[0].revision : null,
  };
}

/** Saving a draft never changes the version staff can read. */
export function applyReleaseCommand(
  state: ReleaseContentState,
  command: ReleaseCommand,
  revision: string,
): ReleaseContentState {
  command = commandSchema.parse(command);
  const entries = structuredClone(state.entries);
  if (command.kind === 'save') {
    const draft = releaseDraftSchema.parse(command.draft);
    const existing = entries.find((entry) => entry.draft.id === draft.id);
    if (existing) existing.draft = draft;
    else entries.unshift({ draft, published: null, revision });
  } else {
    const index = entries.findIndex((entry) => entry.draft.id === command.id);
    if (index < 0) throw new Error('Topic no longer exists. Reload the page.');
    const entry = entries[index];
    switch (command.kind) {
      case 'publish':
        entry.published = releaseDraftSchema.parse(entry.draft);
        entry.revision = revision;
        break;
      case 'unpublish':
        entry.published = null;
        break;
      case 'delete':
        entries.splice(index, 1);
        break;
      case 'move': {
        const step = command.direction === 'up' ? -1 : 1;
        let target = index + step;
        while (
          target >= 0 &&
          target < entries.length &&
          releaseDateKey(entries[target].draft.date) !== releaseDateKey(entry.draft.date)
        )
          target += step;
        if (target >= 0 && target < entries.length)
          [entries[index], entries[target]] = [entries[target], entries[index]];
        break;
      }
      default:
        throw new Error('Unknown content action.');
    }
  }
  return { version: state.version + 1, entries };
}

import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { ReleaseContentModel } from '@coex/shared/core/models/release-content.model';
import {
  changeReleaseContent,
  getReleaseContent,
  getPublishedReleases,
} from '@/modules/core/services/release-content.service';
import { RELEASE_NOTES } from '@/modules/core/release-notes';
const context = {
  tenantId: new Types.ObjectId(),
  userId: new Types.ObjectId(),
  isPlatformAdmin: false,
};
const draft = {
  id: 'qa-topic',
  date: '26 October 2026',
  title: 'QA isolated topic',
  sections: [{ heading: 'QA section', items: ['QA paragraph'] }],
};
beforeAll(() => connectForTests('whats_new_management_20261026'));
beforeEach(clearDatabase);
afterAll(disconnectFromTests);
it('reads built-in history without writing and isolates tenant drafts/publications', async () => {
  expect((await runWithContext(context, getReleaseContent)).version).toBe(0);
  expect(await ReleaseContentModel.countDocuments()).toBe(0);
  const saved = await runWithContext(context, () =>
    changeReleaseContent(0, { kind: 'save', draft }),
  );
  expect(saved.version).toBe(1);
  expect((await runWithContext(context, getPublishedReleases)).releases).toEqual(RELEASE_NOTES);
  await runWithContext(context, () => changeReleaseContent(1, { kind: 'publish', id: draft.id }));
  const publicContent = await runWithContext(context, getPublishedReleases);
  expect(publicContent.releases[0]).toEqual(draft);
  expect(publicContent.latestId).not.toBe(draft.id);
  expect(
    (await runWithContext({ ...context, tenantId: new Types.ObjectId() }, getPublishedReleases))
      .releases,
  ).toEqual(RELEASE_NOTES);
  await expect(
    runWithContext(context, () => changeReleaseContent(1, { kind: 'delete', id: draft.id })),
  ).rejects.toThrow('another session');
});
it('allows only one concurrent first save and only one update for a shared version', async () => {
  const first = await Promise.allSettled(
    [0, 1].map(() =>
      runWithContext(context, () => changeReleaseContent(0, { kind: 'save', draft })),
    ),
  );
  expect(first.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  const updates = await Promise.allSettled(
    [0, 1].map(() =>
      runWithContext(context, () => changeReleaseContent(1, { kind: 'publish', id: draft.id })),
    ),
  );
  expect(updates.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect((await runWithContext(context, getReleaseContent)).version).toBe(2);
});

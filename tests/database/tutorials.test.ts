import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { TutorialModel, TutorialSeenModel } from '@coex/shared/core/models/tutorial.model';
import { tutorialView } from '@/modules/tutorials/service';
const tenantId = new Types.ObjectId(),
  userId = new Types.ObjectId();
const context = { tenantId, userId, isPlatformAdmin: false };
beforeAll(async () => {
  await connectForTests('tutorials_1017');
});
beforeEach(clearDatabase);
afterAll(disconnectFromTests);
it('keeps drafts private and never exposes the storage key', async () => {
  await TutorialModel.create({
    tenantId,
    title: 'Ticket tour',
    fileKey: 'private/key',
    contentType: 'video/mp4',
    revision: 'one',
    active: false,
  });
  expect(await runWithContext(context, () => tutorialView())).toBeNull();
  const draft = await runWithContext(context, () => tutorialView(true));
  expect(draft?.title).toBe('Ticket tour');
  expect(draft).not.toHaveProperty('fileKey');
});
it('isolates tenants and tracks each person and publication separately', async () => {
  await TutorialModel.create({
    tenantId,
    title: 'Ticket tour',
    fileKey: 'key',
    contentType: 'video/mp4',
    revision: 'one',
    active: true,
  });
  await TutorialSeenModel.create({ tenantId, userId, revision: 'one' });
  expect((await runWithContext(context, () => tutorialView()))?.seen).toBe(true);
  expect(
    (await runWithContext({ ...context, userId: new Types.ObjectId() }, () => tutorialView()))
      ?.seen,
  ).toBe(false);
  expect(
    await runWithContext({ ...context, tenantId: new Types.ObjectId() }, () => tutorialView(true)),
  ).toBeNull();
  await TutorialModel.updateOne({ tenantId }, { $set: { revision: 'two' } });
  expect((await runWithContext(context, () => tutorialView()))?.seen).toBe(false);
  await TutorialModel.updateOne({ tenantId }, { $set: { active: false } });
  expect(await runWithContext(context, () => tutorialView())).toBeNull();
});
it('serves a linked draft through the provider player without exposing stored keys', async () => {
  await TutorialModel.create({
    tenantId,
    title: 'Linked tour',
    videoUrl: 'https://youtu.be/M7lc1UVf-VE',
    revision: 'link',
    active: false,
  });
  expect(await runWithContext(context, () => tutorialView())).toBeNull();
  const view = await runWithContext(context, () => tutorialView(true));
  expect(view?.embed).toBe(true);
  expect(view?.url).toBe('https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?autoplay=0&rel=0');
});

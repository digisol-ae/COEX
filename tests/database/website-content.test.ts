import { beforeAll, beforeEach, afterAll, it, expect, vi } from 'vitest';
import { connectForTests, clearDatabase, disconnectFromTests } from '../setup';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { AuditLogModel } from '@coex/shared/core/models/audit-log.model';
import {
  WebsiteVersionModel,
  WebsiteContentModel,
} from '@coex/shared/core/models/website-content.model';
import { runWithContext, type RequestContext } from '@/lib/tenant-context';
import {
  websiteEditor,
  changeWebsite,
  publishedWebsite,
} from '@/modules/core/services/website-content.service';
let context: RequestContext;
const content = {
  texts: { Heading: 'Private draft' },
  links: { '/register': '/register' },
  images: {},
  faq: [['Question', 'Answer']],
  seo: { title: 'Title', description: 'Description', image: '' },
};
const owner = <T>(fn: () => T) => runWithContext(context, fn);
beforeAll(() => connectForTests('website_content'));
beforeEach(async () => {
  await clearDatabase();
  const tenant = await TenantModel.create({ name: 'Owner', slug: 'website-owner' });
  const user = await UserModel.create({
    tenantId: tenant._id,
    name: 'Owner',
    email: 'owner@website.test',
    role: 'platform_admin',
  });
  context = { tenantId: tenant._id, userId: user._id, isPlatformAdmin: true };
});
afterAll(disconnectFromTests);
it('keeps drafts private, publishes explicitly and restores only to draft', async () => {
  await owner(() => changeWebsite('save', 0, content));
  expect(await publishedWebsite()).toBeUndefined();
  await owner(() => changeWebsite('publish', 1));
  expect((await publishedWebsite())?.texts.Heading).toBe('Private draft');
  await owner(() => changeWebsite('save', 2, { ...content, texts: { Heading: 'Next' } }));
  expect((await publishedWebsite())?.texts.Heading).toBe('Private draft');
  await owner(() => changeWebsite('restore', 3, undefined, 1));
  expect((await owner(websiteEditor)).draft?.texts.Heading).toBe('Private draft');
  expect(await WebsiteVersionModel.countDocuments()).toBe(4);
  expect(await AuditLogModel.countDocuments({ entityType: 'website' })).toBe(4);
});
it.each(['tenant_admin', 'manager', 'staff'])(
  'rejects stored %s even with forged owner context',
  async (role) => {
    await UserModel.updateOne({ _id: context.userId }, { $set: { role } });
    await expect(owner(websiteEditor)).rejects.toThrow(/platform owner/);
    for (const op of ['save', 'publish', 'restore'] as const)
      await expect(owner(() => changeWebsite(op, 0, content, 1))).rejects.toThrow(/platform owner/);
    expect(await WebsiteContentModel.countDocuments()).toBe(0);
  },
);
it('rejects missing owner context and suspended/deleted owners', async () => {
  await expect(
    runWithContext({ ...context, isPlatformAdmin: false }, websiteEditor),
  ).rejects.toThrow(/platform owner/);
  await UserModel.updateOne({ _id: context.userId }, { $set: { status: 'suspended' } });
  await expect(owner(websiteEditor)).rejects.toThrow(/platform owner/);
  await UserModel.updateOne(
    { _id: context.userId },
    { $set: { status: 'active', deletedAt: new Date() } },
  );
  await expect(owner(websiteEditor)).rejects.toThrow(/platform owner/);
});
it('rejects stale saves, publishes and restores without extra history', async () => {
  await owner(() => changeWebsite('save', 0, content));
  for (const op of ['save', 'publish', 'restore'] as const)
    await expect(owner(() => changeWebsite(op, 0, content, 1))).rejects.toThrow(/changed/);
  expect(await WebsiteVersionModel.countDocuments()).toBe(1);
});
it('allows exactly one concurrent writer', async () => {
  await owner(() => changeWebsite('save', 0, content));
  const results = await Promise.allSettled([
    owner(() => changeWebsite('save', 1, content)),
    owner(() => changeWebsite('save', 1, { ...content, texts: { Heading: 'Race' } })),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(await WebsiteVersionModel.countDocuments()).toBe(2);
});
it('rolls back content and history if audit fails', async () => {
  const spy = vi
    .spyOn(AuditLogModel, 'create')
    .mockRejectedValueOnce(new Error('Audit unavailable'));
  try {
    await expect(owner(() => changeWebsite('save', 0, content))).rejects.toThrow(
      'Audit unavailable',
    );
  } finally {
    spy.mockRestore();
  }
  expect(await WebsiteContentModel.countDocuments()).toBe(0);
  expect(await WebsiteVersionModel.countDocuments()).toBe(0);
});
it('rejects script URLs and arbitrary/private media paths', async () => {
  for (const url of ['javascript:alert(1)', '//evil.test', 'data:text/html,x', '/\\evil.test'])
    await expect(
      owner(() => changeWebsite('save', 0, { ...content, links: { '/register': url } })),
    ).rejects.toThrow();
  for (const image of [
    '/api/attachments/private',
    'https://evil.test/a.png',
    '/website/../secret.png',
    '/website/a.svg',
  ])
    await expect(
      owner(() => changeWebsite('save', 0, { ...content, seo: { ...content.seo, image } })),
    ).rejects.toThrow();
  expect(await WebsiteVersionModel.countDocuments()).toBe(0);
});

import { connectToDatabase } from '@/lib/db';
import { requirePlatformAdministrator } from './platform-access.service';
import { recordAudit } from './audit.service';
import {
  WebsiteContentModel,
  WebsiteVersionModel,
} from '@coex/shared/core/models/website-content.model';
import { websiteSchema, type WebsiteContent } from '@/components/landing/website-schema';
const key = 'website';
export async function publishedWebsite(): Promise<WebsiteContent | undefined> {
  await connectToDatabase();
  const row = await WebsiteContentModel.findOne({ key }).select('published').lean();
  return row?.published ? websiteSchema.parse(row.published) : undefined;
}
export async function websiteEditor() {
  await requirePlatformAdministrator();
  const row = await WebsiteContentModel.findOne({ key }).lean();
  const history = await WebsiteVersionModel.find({})
    .select('revision operation createdAt')
    .sort({ revision: -1 })
    .limit(50)
    .lean();
  return {
    revision: row?.revision ?? 0,
    draft: row?.draft ? websiteSchema.parse(row.draft) : null,
    history: history.map((v) => ({
      revision: v.revision,
      operation: v.operation,
      at: v.createdAt.toISOString(),
    })),
  };
}
export async function changeWebsite(
  operation: 'save' | 'publish' | 'restore',
  expected: number,
  input?: unknown,
  restoreRevision?: number,
) {
  const actor = await requirePlatformAdministrator();
  if (!Number.isSafeInteger(expected) || expected < 0) throw new Error('Invalid revision');
  if (!['save', 'publish', 'restore'].includes(operation)) throw new Error('Invalid operation');
  const db = await connectToDatabase();
  await Promise.all([WebsiteContentModel.init(), WebsiteVersionModel.init()]);
  const session = await db.startSession();
  try {
    await session.withTransaction(async () => {
      const before = await WebsiteContentModel.findOne({ key }).session(session);
      if ((before?.revision ?? 0) !== expected)
        throw new Error('Content changed. Reload before saving.');
      let content: WebsiteContent;
      if (operation === 'restore') {
        const v = await WebsiteVersionModel.findOne({ revision: restoreRevision }).session(session);
        if (!v) throw new Error('Version not found');
        content = websiteSchema.parse(v.content);
      } else if (operation === 'publish') {
        if (!before) throw new Error('Save a draft first');
        content = websiteSchema.parse(before.draft);
      } else content = websiteSchema.parse(input);
      const revision = expected + 1;
      if (before) {
        const result = await WebsiteContentModel.updateOne(
          { key, revision: expected },
          {
            $set: {
              draft: content,
              revision,
              ...(operation === 'publish' ? { published: content } : {}),
            },
          },
          { session },
        );
        if (result.modifiedCount !== 1) throw new Error('Content changed. Reload before saving.');
      } else
        await WebsiteContentModel.create([{ key, revision, draft: content, published: null }], {
          session,
        });
      await WebsiteVersionModel.create([{ revision, content, operation, actorId: actor._id }], {
        session,
      });
      await recordAudit(
        {
          action: 'website.' + operation,
          entityType: 'website',
          before: { revision: expected },
          after: { revision, restoreRevision },
        },
        session,
      );
    });
  } finally {
    await session.endSession();
  }
  return websiteEditor();
}

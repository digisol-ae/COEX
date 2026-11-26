import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { connectToDatabase } from '@/lib/db';
import { fileStorage } from '@/lib/storage';
import { getContext, runWithContext } from '@/lib/tenant-context';
import { WebsiteMediaModel } from '@coex/shared/core/models/website-media.model';
import { WebsiteContentModel } from '@coex/shared/core/models/website-content.model';
import { requirePlatformAdministrator } from './platform-access.service';
import { recordAudit } from './audit.service';
import { websiteSchema, type WebsiteContent } from '@/components/landing/website-schema';
export const WEBSITE_UPLOAD_LIMIT = 700 * 1024;
export function websiteMediaIds(content: WebsiteContent) {
  return [...Object.values(content.images), content.seo.image]
    .filter((v) => v.startsWith('/api/website-media/'))
    .map((v) => v.slice('/api/website-media/'.length));
}
export async function validateWebsiteMedia(content: WebsiteContent) {
  const ids = [...new Set(websiteMediaIds(content))];
  if (
    ids.length &&
    (await WebsiteMediaModel.countDocuments({ publicId: { $in: ids } })) !== ids.length
  )
    throw new Error('Invalid website image. Upload it again.');
}
export async function uploadWebsiteMedia(body: Buffer) {
  const actor = await requirePlatformAdministrator();
  if (!body.length || body.length > WEBSITE_UPLOAD_LIMIT)
    throw new Error('Image must be no larger than 700 KB.');
  const decoder = sharp(body, { limitInputPixels: 16_000_000, animated: false, failOn: 'warning' });
  const metadata = await decoder.metadata();
  if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1)
    throw new Error('Choose a static PNG, JPEG or WebP image.');
  const { data, info } = await decoder
    .rotate()
    .resize({ width: 4096, height: 4096, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer({ resolveWithObject: true });
  const context = getContext(),
    publicId = randomUUID();
  const stored = await fileStorage().put({
    tenantId: String(context.tenantId),
    fileName: publicId + '.webp',
    contentType: 'image/webp',
    body: data,
  });
  const db = await connectToDatabase();
  await WebsiteMediaModel.init();
  const session = await db.startSession();
  try {
    await session.withTransaction(async () => {
      const [media] = await WebsiteMediaModel.create(
        [
          {
            publicId,
            storageKey: stored.key,
            tenantId: context.tenantId,
            actorId: actor._id,
            bytes: stored.bytes,
            width: info.width,
            height: info.height,
          },
        ],
        { session },
      );
      await recordAudit(
        {
          action: 'website.media.upload',
          entityType: 'website-media',
          entityId: media._id,
          after: { publicId, bytes: stored.bytes },
        },
        session,
      );
    });
  } catch (error) {
    await fileStorage().remove(stored.key);
    throw error;
  } finally {
    await session.endSession();
  }
  return { url: '/api/website-media/' + publicId, width: info.width, height: info.height };
}
export async function readWebsiteMedia(id: string, privatePreview = false) {
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(id))
    throw new Error('Image not found.');
  if (privatePreview) await requirePlatformAdministrator();
  else await connectToDatabase();
  if (!privatePreview) {
    const row = await WebsiteContentModel.findOne({ key: 'website' }).select('published').lean();
    if (!row?.published || !websiteMediaIds(websiteSchema.parse(row.published)).includes(id))
      throw new Error('Image not found.');
  }
  const media = await WebsiteMediaModel.findOne({ publicId: id }).lean();
  if (!media) throw new Error('Image not found.');
  // Platform media belongs to the global website; permission was checked above. Its storage
  // reservation still belongs to the uploading owner's workspace.
  const read = () => fileStorage().get(media.storageKey);
  return privatePreview
    ? runWithContext({ ...getContext(), tenantId: media.tenantId }, read)
    : read();
}

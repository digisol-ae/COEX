import { hasTrustedRequestOrigin } from '@/lib/request-origin';
import { parseVideoLink } from '@/modules/tutorials/video-link';
import { recordAudit } from '@/modules/core/services/audit.service';
import { randomUUID } from 'node:crypto';
import { asUser, getSignedInUser } from '@/lib/session';
import { getContext } from '@/lib/tenant-context';
import { fileStorage } from '@/lib/storage';
import { TutorialModel, TutorialSeenModel } from '@coex/shared/core/models/tutorial.model';
import { currentTutorial, tutorialView } from '@/modules/tutorials/service';

const MAX_UPLOAD = 30 * 1024 * 1024;
export async function GET(request: Request) {
  const user = await getSignedInUser();
  if (user?.role === 'client_contact')
    return Response.json({ error: 'Tutorials are available to staff accounts.' }, { status: 403 });
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const admin =
    new URL(request.url).searchParams.get('admin') === '1' &&
    user.permissions.includes('tenant.manage');
  return Response.json(
    { tutorial: await asUser(user, () => tutorialView(admin)) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
export async function POST(request: Request) {
  const user = await getSignedInUser();
  if (user?.role === 'client_contact')
    return Response.json({ error: 'Tutorials are available to staff accounts.' }, { status: 403 });
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (!hasTrustedRequestOrigin(request))
    return Response.json(
      { error: 'This request could not be verified. Refresh Worktello and try again.' },
      { status: 403 },
    );
  try {
    // Bound the stream before parsing multipart data; uploads never enter a server action.
    const reader = request.body?.getReader();
    if (!reader) throw new Error('No content received.');
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_UPLOAD) {
        await reader.cancel();
        return Response.json({ error: 'Maximum upload size is 30 MB.' }, { status: 413 });
      }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks);
    const multipart = request.headers.get('content-type')?.startsWith('multipart/form-data');
    if (multipart && !user.permissions.includes('tenant.manage'))
      return Response.json(
        { error: 'Only workspace administrators can manage tutorials.' },
        { status: 403 },
      );
    return await asUser(user, async () => {
      const tutorial = await currentTutorial();
      const { tenantId, userId } = getContext();
      let auditAction = '';
      if (multipart) {
        auditAction = 'tutorial.uploaded';
        const form = await new Response(body, {
          headers: { 'Content-Type': request.headers.get('content-type')! },
        }).formData();
        const file = form.get('video');
        const title = String(form.get('title') ?? '').trim();
        if (!title || title.length > 100) throw new Error('Enter a title of up to 100 characters.');
        if (!(file instanceof File) || file.size === 0)
          throw new Error('Choose an MP4 or WebM video.');
        const bytes = Buffer.from(await file.arrayBuffer());
        const mp4 = bytes.length >= 12 && bytes.toString('ascii', 4, 8) === 'ftyp';
        const webm = bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
        if (!mp4 && !webm) throw new Error('Choose a valid MP4 or WebM video.');
        const contentType = mp4 ? 'video/mp4' : 'video/webm';
        const stored = await fileStorage().put({
          tenantId: String(tenantId),
          fileName: mp4 ? 'tutorial.mp4' : 'tutorial.webm',
          contentType,
          body: bytes,
        });
        try {
          await TutorialModel.updateOne(
            { tenantId },
            {
              $set: {
                title,
                fileKey: stored.key,
                videoUrl: null,
                contentType,
                revision: randomUUID(),
                active: false,
              },
            },
            { upsert: true },
          );
        } catch (error) {
          await fileStorage().remove(stored.key);
          throw error;
        }
      } else {
        const input = JSON.parse(body.toString());
        if (input.action === 'seen') {
          if (tutorial?.active && input.revision === tutorial.revision)
            await TutorialSeenModel.updateOne(
              { tenantId, userId, revision: tutorial.revision },
              { $setOnInsert: { tenantId, userId, revision: tutorial.revision } },
              { upsert: true },
            );
        } else {
          if (!user.permissions.includes('tenant.manage'))
            return Response.json(
              { error: 'Only workspace administrators can manage tutorials.' },
              { status: 403 },
            );
          if (input.action === 'link') {
            const title = typeof input.title === 'string' ? input.title.trim() : '';
            if (!title || title.length > 100)
              throw new Error('Enter a title of up to 100 characters.');
            const link = parseVideoLink(typeof input.url === 'string' ? input.url : '');
            await TutorialModel.updateOne(
              { tenantId },
              {
                $set: {
                  title,
                  videoUrl: link.url,
                  fileKey: null,
                  contentType: null,
                  revision: randomUUID(),
                  active: false,
                },
              },
              { upsert: true },
            );
            await recordAudit({
              action: 'tutorial.linked',
              entityType: 'tutorial',
              entityId: tenantId,
            });
            return Response.json({ ok: true });
          }
          if (!tutorial) throw new Error('Upload a video or add a link first.');
          auditAction = `tutorial.${input.action}`;
          if (input.action === 'publish')
            await TutorialModel.updateOne(
              { tenantId },
              { $set: { active: true, revision: randomUUID() } },
            );
          else if (input.action === 'stop')
            await TutorialModel.updateOne({ tenantId }, { $set: { active: false } });
          else throw new Error('Unknown action.');
        }
      }
      if (auditAction)
        await recordAudit({ action: auditAction, entityType: 'tutorial', entityId: tenantId });
      return Response.json({ ok: true });
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not save tutorial.' },
      { status: 400 },
    );
  }
}

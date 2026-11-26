'use server';
import { asUser, requireStaffUser } from '@/lib/session';
import { changeWebsite } from '@/modules/core/services/website-content.service';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
export async function updateWebsite(
  operation: 'save' | 'publish' | 'restore',
  revision: number,
  input?: unknown,
  restoreRevision?: number,
) {
  const actor = await requireStaffUser();
  try {
    const result = await asUser(actor, () =>
      changeWebsite(operation, revision, input, restoreRevision),
    );
    revalidatePath('/');
    return { ok: true as const, state: result };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof ZodError
          ? 'Check the content, link and image fields.'
          : error instanceof Error &&
              /Content changed|platform owner|Version not found|Save a draft|Invalid/.test(
                error.message,
              )
            ? error.message
            : 'Unable to save. Please retry.',
    };
  }
}

export async function uploadImage(form: FormData) {
  const actor = await requireStaffUser();
  try {
    return await asUser(actor, async () => {
      const { requirePlatformAdministrator } =
        await import('@/modules/core/services/platform-access.service');
      await requirePlatformAdministrator();
      const { uploadWebsiteMedia, WEBSITE_UPLOAD_LIMIT } =
        await import('@/modules/core/services/website-media.service');
      const file = form.get('image');
      if (!(file instanceof File) || file.size > WEBSITE_UPLOAD_LIMIT)
        throw new Error('Choose an image no larger than 700 KB.');
      return {
        ok: true as const,
        ...(await uploadWebsiteMedia(Buffer.from(await file.arrayBuffer()))),
      };
    });
  } catch {
    return {
      ok: false as const,
      error:
        'Upload failed. Choose a static PNG, JPEG or WebP no larger than 700 KB and check your storage allowance.',
    };
  }
}

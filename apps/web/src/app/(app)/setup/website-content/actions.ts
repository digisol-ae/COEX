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

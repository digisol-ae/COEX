'use server';

import { Types } from 'mongoose';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import { repository } from '@/lib/repository';
import { UserModel } from '@coex/shared/core/models/user.model';
import { TaskModel } from '@coex/shared/tasks/models/task.model';
import { getTask } from '@/modules/tasks/services/task.service';
import { signFirstPartyInWorktello } from '@/modules/crm/services/agreement-signature.service';
import type { SignatureCapture } from '@coex/shared/crm/signature-capture';

export async function signRequest(id: string, consent: boolean, capture: SignatureCapture) {
  const actor = await requirePermission('contract.read');
  try {
    await asUser(actor, () => signFirstPartyInWorktello(id, consent, capture));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not sign agreement.' };
  }
  redirect('/requests');
}

export async function reviewTaskRequest(form: FormData) {
  const complete = form.get('operation') === 'complete';
  const actor = await requirePermission(complete ? 'task.read.all' : 'task.manage');
  const id = String(form.get('taskId') ?? '');
  const reviewerId = String(form.get('reviewerId') ?? '');
  if (!Types.ObjectId.isValid(id)) return;
  await asUser(actor, async () => {
    const task = await getTask(id);
    if (!task) return;
    const tasks = repository(TaskModel);
    if (complete) {
      await tasks.updateOne(
        { _id: task._id, 'review.reviewerId': actor.id, 'review.reviewedAt': null },
        { $set: { 'review.reviewedAt': new Date() } },
      );
    } else if (Types.ObjectId.isValid(reviewerId) && reviewerId !== actor.id) {
      const reviewer = await UserModel.exists({
        _id: reviewerId,
        tenantId: actor.tenantId,
        status: 'active',
        deletedAt: null,
        role: { $in: ['tenant_admin', 'platform_admin'] },
      });
      if (!reviewer) return;
      await tasks.updateOne(
        {
          _id: task._id,
          $or: [{ 'review.reviewerId': null }, { 'review.reviewedAt': { $ne: null } }],
        },
        {
          $set: {
            review: {
              reviewerId,
              requestedBy: actor.id,
              requestedAt: new Date(),
              reviewedAt: null,
            },
          },
        },
      );
    }
  });
  revalidatePath('/requests');
  revalidatePath('/tasks/' + id);
}

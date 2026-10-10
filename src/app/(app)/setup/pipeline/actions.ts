'use server';

import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import {
  addStage,
  moveStage,
  removeStage,
  saveLostReasons,
  saveStaleDays,
  updateStage,
} from '@/modules/crm/services/pipeline.service';

export interface PipelineFormState {
  error?: string;
  saved?: boolean;
}

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? '').trim();
}

async function run(work: () => Promise<void>): Promise<PipelineFormState> {
  try {
    await work();
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the pipeline.' };
  }

  revalidatePath('/setup/pipeline');
  return { saved: true };
}

export async function addStageAction(
  _previous: PipelineFormState,
  formData: FormData,
): Promise<PipelineFormState> {
  const actor = await requirePermission('pipeline.manage');

  return run(() =>
    asUser(actor, () =>
      addStage({
        name: text(formData, 'name'),
        probability: Number(text(formData, 'probability')),
      }),
    ),
  );
}

export async function updateStageAction(
  _previous: PipelineFormState,
  formData: FormData,
): Promise<PipelineFormState> {
  const actor = await requirePermission('pipeline.manage');

  return run(() =>
    asUser(actor, () =>
      updateStage(text(formData, 'id'), {
        name: text(formData, 'name'),
        probability: Number(text(formData, 'probability')),
      }),
    ),
  );
}

export async function moveStageAction(
  id: string,
  direction: 'up' | 'down',
): Promise<PipelineFormState> {
  const actor = await requirePermission('pipeline.manage');
  return run(() => asUser(actor, () => moveStage(id, direction)));
}

export async function removeStageAction(id: string): Promise<PipelineFormState> {
  const actor = await requirePermission('pipeline.manage');
  return run(() => asUser(actor, () => removeStage(id)));
}

export async function saveLostReasonsAction(
  _previous: PipelineFormState,
  formData: FormData,
): Promise<PipelineFormState> {
  const actor = await requirePermission('pipeline.manage');

  return run(() => asUser(actor, () => saveLostReasons(text(formData, 'reasons').split('\n'))));
}

export async function saveStaleDaysAction(
  _previous: PipelineFormState,
  formData: FormData,
): Promise<PipelineFormState> {
  const actor = await requirePermission('pipeline.manage');

  return run(() => asUser(actor, () => saveStaleDays(Number(text(formData, 'days')))));
}

'use server';
import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import {
  saveAgreementTemplate,
  archiveAgreementTemplate,
  generateAgreementDraft,
  saveAgreementDraft,
} from '@/modules/crm/services/agreement.service';
export async function templateMutation(input: {
  id?: string;
  name: string;
  type: string;
  body: string;
  reviewNotes: string;
  revision: number;
}) {
  const actor = await requirePermission('contract.manage');
  try {
    const id = await asUser(actor, () => saveAgreementTemplate(input));
    revalidatePath('/contracts/templates');
    return { id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not save template.' };
  }
}
export async function archiveTemplateMutation(id: string) {
  const actor = await requirePermission('contract.manage');
  try {
    await asUser(actor, () => archiveAgreementTemplate(id));
    revalidatePath('/contracts/templates');
    return { saved: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not archive template.' };
  }
}
export async function draftMutation(input: {
  contractId: string;
  operation: 'generate' | 'save';
  templateId: string;
  values: Record<string, string>;
  body: string;
  reviewed: boolean;
  revision: number;
}) {
  const actor = await requirePermission('contract.manage');
  try {
    await asUser(actor, () =>
      input.operation === 'generate'
        ? generateAgreementDraft(input.contractId, input.templateId, input.values, input.revision)
        : saveAgreementDraft(input.contractId, input.body, input.reviewed, input.revision),
    );
    revalidatePath(`/contracts/${input.contractId}/draft`);
    return { saved: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not save draft.' };
  }
}

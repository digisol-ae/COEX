'use server';
import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import {
  requestAgreementSignature,
  cancelAgreementSignature,
  sendSecondPartyInvitation,
  emailSignedAgreement,
} from '@/modules/crm/services/agreement-signature.service';

export async function signatureMutation(input: {
  contractId: string;
  contactId?: string;
  revision?: number;
  cancelId?: string;
  providerUserId?: string;
  sendSecondPartyId?: string;
  invitation?: Parameters<typeof sendSecondPartyInvitation>[2];
  provider?: Parameters<typeof requestAgreementSignature>[3];
}) {
  const actor = await requirePermission('contract.manage');
  try {
    await asUser(actor, async () => {
      if (input.cancelId) await cancelAgreementSignature(input.contractId, input.cancelId);
      else if (input.sendSecondPartyId)
        await sendSecondPartyInvitation(
          input.contractId,
          input.sendSecondPartyId,
          input.invitation,
        );
      else {
        if (!input.provider && !input.providerUserId)
          throw new Error('Choose the First Party signer.');
        await requestAgreementSignature(
          input.contractId,
          input.contactId ?? '',
          input.revision ?? 0,
          input.provider,
          input.providerUserId,
        );
      }
    });
    revalidatePath(`/contracts/${input.contractId}/signature`);
    return { saved: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Could not update signature request.',
    };
  }
}

export async function sendSignedCopyAction(
  contractId: string,
  requestId: string,
  draft: Parameters<typeof emailSignedAgreement>[2],
) {
  const actor = await requirePermission('contract.manage');
  try {
    await asUser(actor, () => emailSignedAgreement(contractId, requestId, draft));
    return { queued: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not send the signed copy.' };
  }
}

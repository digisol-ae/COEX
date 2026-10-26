import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { connectForTests, clearDatabase, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { createOrganisation } from '@/modules/crm/services/organisation.service';
import { createContract } from '@/modules/crm/services/contract.service';
import {
  listAgreementTemplates,
  saveAgreementTemplate,
  archiveAgreementTemplate,
  generateAgreementDraft,
  saveAgreementDraft,
  getAgreementDraft,
} from '@/modules/crm/services/agreement.service';
const one = {
  tenantId: new Types.ObjectId(),
  userId: new Types.ObjectId(),
  isPlatformAdmin: false,
};
const two = { ...one, tenantId: new Types.ObjectId() };
const within = <T>(fn: () => Promise<T>) => runWithContext(one, fn);
beforeAll(() => connectForTests('agreement_drafting'));
beforeEach(clearDatabase);
afterAll(disconnectFromTests);
it('isolates custom templates and preserves independently edited customer snapshots', async () => {
  await within(async () => {
    const organisationId = await createOrganisation({
      name: 'QA Agreement Customer',
      kind: 'client',
    });
    const contractId = await createContract({
      organisationId,
      title: 'IT support',
      type: 'amc',
      startDate: '2026-11-01',
      endDate: '2027-10-31',
      billingFrequency: 'quarterly',
      value: '250',
    });
    const input = {
      name: 'QA template',
      type: 'amc',
      body: '{{customer_name}} {{amount}} {{start_date}} {{custom}}',
      reviewNotes: 'Review test',
      revision: 0,
    };
    const id = await saveAgreementTemplate(input);
    await generateAgreementDraft(contractId, id, {}, 0);
    const first = (await getAgreementDraft(contractId))!;
    expect(first.body).toContain('QA Agreement Customer AED 250.00 2026-11-01 {{custom}}');
    await expect(saveAgreementDraft(contractId, first.body, true, first.revision)).rejects.toThrow(
      'placeholder',
    );
    await saveAgreementDraft(contractId, 'Negotiated complete wording', true, first.revision);
    await expect(
      saveAgreementDraft(contractId, 'Stale edit', false, first.revision),
    ).rejects.toThrow('changed');
    await saveAgreementTemplate({ ...input, id, revision: 1, body: 'Changed template' });
    expect((await getAgreementDraft(contractId))?.body).toBe('Negotiated complete wording');
    await runWithContext(two, async () => {
      expect((await listAgreementTemplates()).some((t) => t.id === id)).toBe(false);
      expect(await getAgreementDraft(contractId)).toBeNull();
      await expect(saveAgreementDraft(contractId, 'Cross tenant', false, 2)).rejects.toThrow(
        'not found',
      );
      await expect(generateAgreementDraft(contractId, id, {}, 0)).rejects.toThrow('not found');
    });
    await archiveAgreementTemplate(id);
    expect((await listAgreementTemplates()).some((t) => t.id === id)).toBe(false);
    expect((await getAgreementDraft(contractId))?.reviewed).toBe(true);
    await expect(
      generateAgreementDraft(contractId, 'builtin:r4-subscription', {}, 2),
    ).rejects.toThrow('matching');
  });
});

it('requires annual billing for the R4 subscription starter', async () => {
  await within(async () => {
    const organisationId = await createOrganisation({
      name: 'QA Subscription Customer',
      kind: 'client',
    });
    const contractId = await createContract({
      organisationId,
      title: 'R4 subscription',
      type: 'subscription',
      startDate: '2026-11-01',
      endDate: '2027-10-31',
      billingFrequency: 'monthly',
      value: '250',
    });
    await expect(
      generateAgreementDraft(contractId, 'builtin:r4-subscription', {}, 0),
    ).rejects.toThrow('annual billing');
  });
});

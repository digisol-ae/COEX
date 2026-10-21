import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { createOrganisation } from '@/modules/crm/services/organisation.service';
import { createProduct, listProducts } from '@/modules/crm/services/product.service';
import {
  createContract,
  getContract,
  renewContract,
  setContractStatus,
  updateContract,
  type ContractInput,
} from '@/modules/crm/services/contract.service';
const context = {
  tenantId: new Types.ObjectId(),
  userId: new Types.ObjectId(),
  isPlatformAdmin: false,
};
const run = <T>(work: () => Promise<T>) => runWithContext(context, work);
beforeAll(() => connectForTests('services_1021'));
afterAll(disconnectFromTests);
beforeEach(clearDatabase);
async function seed() {
  const organisationId = await createOrganisation({ name: 'QA TEST Clinic', kind: 'client' });
  const parent = await createProduct({
    name: 'dOne',
    code: 'DONE',
    kind: 'software',
    serviceModels: ['subscription'],
  });
  const moduleId = await createProduct({
    name: 'dOne Appointments',
    code: 'DONE-APPT',
    kind: 'module',
    parentProductId: parent,
    serviceModels: ['subscription'],
  });
  const input: ContractInput = {
    organisationId,
    title: 'QA TEST subscription',
    type: 'subscription',
    startDate: '2026-10-01',
    endDate: '2027-09-30',
    billingFrequency: 'quarterly',
    setupFee: '1000',
    trainingFee: '250',
    hardwareTerms: 'DigiSol owns server; return at end',
    serviceLines: [
      { productId: moduleId, quantity: 2, unitPrice: '300', description: 'Appointments seats' },
    ],
  };
  return { input, moduleId };
}
it('persists module rates separately from upfront charges and resets upfront fees on renewal', () =>
  run(async () => {
    const { input, moduleId } = await seed();
    const id = await createContract(input);
    const saved = await getContract(id);
    expect(saved?.valueMinorUnits).toBe(60000);
    expect(saved?.setupFeeMinorUnits).toBe(100000);
    expect(saved?.serviceLines?.[0].productId).toBe(moduleId);
    expect(saved?.productIds).toContain(moduleId);
    await updateContract(id, {
      ...input,
      serviceLines: [{ productId: moduleId, quantity: 3, unitPrice: '300' }],
    });
    await setContractStatus(id, 'active');
    const renewal = await getContract(await renewContract(id));
    expect(renewal?.valueMinorUnits).toBe(90000);
    expect(renewal?.serviceLines?.[0].quantity).toBe(3);
    expect(renewal?.setupFeeMinorUnits).toBe(0);
    expect(renewal?.trainingFeeMinorUnits).toBe(0);
    expect(renewal?.hardwareTerms).toBe(input.hardwareTerms);
    expect(
      (await listProducts()).find((product) => product.id === moduleId)?.parentProductId,
    ).toBeTruthy();
  }));
it('calculates yearly licence support and keeps customer and product tenant boundaries', () =>
  run(async () => {
    const { input, moduleId } = await seed();
    const support = await createContract({
      ...input,
      type: 'amc',
      serviceLines: [],
      pricingMethod: 'licence_percentage',
      licenceValue: '20000',
      annualSupportPercent: 15,
      billingFrequency: 'yearly',
    });
    expect((await getContract(support))?.valueMinorUnits).toBe(300000);
    await expect(createContract({ ...input, type: 'amc' })).rejects.toThrow('not available');
    await expect(
      runWithContext({ ...context, tenantId: new Types.ObjectId() }, () => createContract(input)),
    ).rejects.toThrow('customer');
    await expect(
      createProduct({
        name: 'Invalid module',
        code: 'BAD',
        kind: 'module',
        parentProductId: moduleId,
      }),
    ).rejects.toThrow('parent');
  }));

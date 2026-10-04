import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import {
  createOrganisation,
  updateOrganisation,
} from '@/modules/crm/services/organisation.service';
import { createProduct } from '@/modules/crm/services/product.service';
import {
  archiveContract,
  createContract,
  listContracts,
  setContractStatus,
  updateContract,
  type ContractInput,
} from '@/modules/crm/services/contract.service';
import { todayKey } from '@/modules/crm/contract-status';

const contextOne = {
  tenantId: new Types.ObjectId(),
  userId: new Types.ObjectId(),
  isPlatformAdmin: false,
};
const contextTwo = { ...contextOne, tenantId: new Types.ObjectId() };

const inOne = <T>(work: () => Promise<T>) => runWithContext(contextOne, work);

/** A day offset from today, as the YYYY-MM-DD the contract stores. */
function dayKey(offsetDays: number): string {
  const day = new Date(`${todayKey()}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + offsetDays);
  return day.toISOString().slice(0, 10);
}

async function input(overrides: Partial<ContractInput> = {}): Promise<ContractInput> {
  const organisationId =
    overrides.organisationId ??
    (await createOrganisation({ name: 'Dental Studio', kind: 'client' }));

  return {
    organisationId,
    title: 'Annual maintenance',
    type: 'amc',
    startDate: dayKey(-100),
    endDate: dayKey(265),
    billingFrequency: 'quarterly',
    value: '1,250.50',
    currency: 'usd',
    ...overrides,
  };
}

beforeAll(async () => {
  await connectForTests('contracts');
});

afterAll(async () => {
  await disconnectFromTests();
});

beforeEach(async () => {
  await clearDatabase();
});

describe('contracts', () => {
  it('stores money as minor units and numbers contracts in sequence', async () => {
    await inOne(async () => {
      await createContract(await input());
      await createContract(await input({ title: 'Second' }));
    });

    const found = await inOne(() => listContracts());
    expect(found.map((contract) => contract.number).sort()).toEqual(['C-1', 'C-2']);
    expect(found[0]?.valueMinorUnits).toBe(125050);
    expect(found[0]?.currency).toBe('USD');
    expect(found[0]?.storedStatus).toBe('draft');
  });

  it('rejects an end date before the start date and an unknown customer', async () => {
    await expect(
      inOne(async () => createContract(await input({ startDate: dayKey(5), endDate: dayKey(1) }))),
    ).rejects.toThrow('before the start date');

    await expect(
      inOne(async () =>
        createContract(await input({ organisationId: new Types.ObjectId().toString() })),
      ),
    ).rejects.toThrow('customer was not found');
  });

  it('requires hours when support time is counted', async () => {
    await expect(
      inOne(async () => createContract(await input({ supportHoursEnabled: true }))),
    ).rejects.toThrow('support hours');
  });

  it('links covered products and refuses one that does not exist', async () => {
    const productId = await inOne(() =>
      createProduct({ name: 'AMC Support', code: 'amc', kind: 'support' }),
    );

    await inOne(async () => createContract(await input({ productIds: [productId] })));
    expect((await inOne(() => listContracts()))[0]?.productIds).toEqual([productId]);

    await expect(
      inOne(async () =>
        createContract(await input({ productIds: [new Types.ObjectId().toString()] })),
      ),
    ).rejects.toThrow('products was not found');
  });

  it('derives expiring and expired from the end date, using the customer warning window', async () => {
    const organisationId = await inOne(() =>
      createOrganisation({ name: 'Careful Clinic', kind: 'client' }),
    );

    await inOne(async () => {
      for (const [title, endDate] of [
        ['Far', dayKey(200)],
        ['Soon', dayKey(10)],
        ['Gone', dayKey(-1)],
      ] as const) {
        const id = await createContract(await input({ organisationId, title, endDate }));
        await setContractStatus(id, 'active');
      }
    });

    const statuses = async () =>
      Object.fromEntries(
        (await inOne(() => listContracts())).map((contract) => [contract.title, contract.status]),
      );

    expect(await statuses()).toEqual({ Far: 'active', Soon: 'expiring', Gone: 'expired' });

    await inOne(() =>
      updateOrganisation(organisationId, {
        name: 'Careful Clinic',
        kind: 'client',
        expiryWarningDays: 365,
      }),
    );

    expect((await statuses()).Far).toBe('expiring');
  });

  it('archives rather than deletes, and keeps each tenant separate', async () => {
    const id = await inOne(async () => createContract(await input()));

    expect(await runWithContext(contextTwo, () => listContracts())).toEqual([]);

    await inOne(() => archiveContract(id));
    expect(await inOne(() => listContracts())).toEqual([]);
  });

  it('updates the terms of a contract', async () => {
    const id = await inOne(async () => createContract(await input()));

    await inOne(async () => updateContract(id, await input({ title: 'Renamed' })));
    expect((await inOne(() => listContracts()))[0]?.title).toBe('Renamed');
  });
});

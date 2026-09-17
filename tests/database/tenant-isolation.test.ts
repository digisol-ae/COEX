import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { repository } from '@/lib/repository';
import { UserModel } from '@/modules/core/models/user.model';

/**
 * The acceptance test for milestone one.
 *
 * Two tenants, one record each. Every read path must return only the caller's own record, and
 * every write path must refuse to reach across. If any of these ever fails, the product is not
 * safe to put in front of a second customer.
 */

const tenantOne = new Types.ObjectId();
const tenantTwo = new Types.ObjectId();
const actorOne = new Types.ObjectId();
const actorTwo = new Types.ObjectId();

const contextOne = { tenantId: tenantOne, userId: actorOne, isPlatformAdmin: false };
const contextTwo = { tenantId: tenantTwo, userId: actorTwo, isPlatformAdmin: false };

const users = () => repository(UserModel);

let recordTwoId: Types.ObjectId;

beforeAll(async () => {
  await connectForTests('isolation');
});

afterAll(async () => {
  await disconnectFromTests();
});

beforeEach(async () => {
  await clearDatabase();

  await runWithContext(contextOne, async () => {
    await users().create({
      name: 'DigiSol Person',
      email: 'person@digisol.ae',
      role: 'tenant_admin',
      status: 'active',
    });
  });

  await runWithContext(contextTwo, async () => {
    const created = await users().create({
      name: 'Other Company Person',
      email: 'person@other.example',
      role: 'tenant_admin',
      status: 'active',
    });

    recordTwoId = created._id;
  });
});

describe('tenant isolation', () => {
  it('lists only the caller tenant records', async () => {
    const found = await runWithContext(contextOne, () => users().find());

    expect(found).toHaveLength(1);
    expect(found[0]?.email).toBe('person@digisol.ae');
  });

  it('refuses to read another tenant record even with its exact identifier', async () => {
    const found = await runWithContext(contextOne, () => users().findById(recordTwoId));

    expect(found).toBeNull();
  });

  it('counts only the caller tenant records', async () => {
    const count = await runWithContext(contextOne, () => users().count());

    expect(count).toBe(1);
  });

  it('refuses to update another tenant record', async () => {
    const updated = await runWithContext(contextOne, () =>
      users().updateOne({ _id: recordTwoId }, { $set: { name: 'Should never happen' } }),
    );

    expect(updated).toBeNull();

    const untouched = await runWithContext(contextTwo, () => users().findById(recordTwoId));
    expect(untouched?.name).toBe('Other Company Person');
  });

  it('refuses to delete another tenant record', async () => {
    const deleted = await runWithContext(contextOne, () =>
      users().softDelete({ _id: recordTwoId }),
    );

    expect(deleted).toBeNull();

    const untouched = await runWithContext(contextTwo, () => users().findById(recordTwoId));
    expect(untouched).not.toBeNull();
  });

  it('stamps the caller tenant onto new records, ignoring any tenant the caller supplies', async () => {
    const created = await runWithContext(contextOne, () =>
      users().create({
        name: 'Planted',
        email: 'planted@digisol.ae',
        role: 'agent',
        status: 'active',
      }),
    );

    expect(String(created.tenantId)).toBe(String(tenantOne));

    const visibleToTwo = await runWithContext(contextTwo, () => users().findById(created._id));
    expect(visibleToTwo).toBeNull();
  });

  it('hides soft deleted records but keeps them retrievable on request', async () => {
    await runWithContext(contextTwo, () => users().softDelete({ _id: recordTwoId }));

    const hidden = await runWithContext(contextTwo, () => users().findById(recordTwoId));
    expect(hidden).toBeNull();

    const stillThere = await runWithContext(contextTwo, () =>
      users().findById(recordTwoId, { withDeleted: true }),
    );
    expect(stillThere).not.toBeNull();
  });

  it('refuses any database access without a request context', async () => {
    expect(() => users().find()).toThrow(/No request context/);
  });
});

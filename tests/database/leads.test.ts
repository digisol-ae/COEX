import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { TenantModel } from '@/modules/core/models/tenant.model';
import { UserModel } from '@/modules/core/models/user.model';
import { createOrganisation } from '@/modules/crm/services/organisation.service';
import { createContact } from '@/modules/crm/services/contact.service';
import {
  DuplicateLeadError,
  archiveLead,
  createLead,
  disqualifyLead,
  listLeads,
  startWorkingLead,
  updateLead,
} from '@/modules/crm/services/lead.service';

const tenantId = new Types.ObjectId();
const managerId = new Types.ObjectId();
const salesId = new Types.ObjectId();
const otherSalesId = new Types.ObjectId();

const as = (userId: Types.ObjectId, tenant = tenantId) => ({
  tenantId: tenant,
  userId,
  isPlatformAdmin: false,
});
const asManager = <T>(work: () => Promise<T>) => runWithContext(as(managerId), work);
const asSales = <T>(work: () => Promise<T>) => runWithContext(as(salesId), work);
const asOtherSales = <T>(work: () => Promise<T>) => runWithContext(as(otherSalesId), work);

beforeAll(async () => {
  await connectForTests('leads');
});

afterAll(async () => {
  await disconnectFromTests();
});

beforeEach(async () => {
  await clearDatabase();
  await TenantModel.create({ _id: tenantId, name: 'DigiSol', slug: 'digisol' });
  await UserModel.create([
    {
      _id: managerId,
      tenantId,
      name: 'Mina Manager',
      email: 'm@x.com',
      role: 'manager',
      status: 'active',
    },
    {
      _id: salesId,
      tenantId,
      name: 'Sam Sales',
      email: 's@x.com',
      role: 'agent',
      status: 'active',
      permissionGrants: ['lead.manage'],
    },
    {
      _id: otherSalesId,
      tenantId,
      name: 'Olu Sales',
      email: 'o@x.com',
      role: 'agent',
      status: 'active',
      permissionGrants: ['lead.manage'],
    },
  ]);
});

describe('leads', () => {
  it('numbers leads in sequence, defaults the owner to the creator and normalises the mobile', async () => {
    await asSales(async () => {
      await createLead({ name: 'Dr Amal', mobile: '050 123 4567', source: 'Referral' });
      await createLead({ name: 'Dr Basma' });
    });

    const found = await asManager(() => listLeads());
    expect(found.map((lead) => lead.number).sort()).toEqual(['L-1', 'L-2']);
    expect(found.find((lead) => lead.name === 'Dr Amal')?.mobile).toBe('+971501234567');
    expect(found.every((lead) => lead.ownerId === String(salesId))).toBe(true);
    expect(found.every((lead) => lead.status === 'new')).toBe(true);
  });

  it('shows a salesperson only their own leads and a manager all of them', async () => {
    await asSales(() => createLead({ name: 'Mine' }));
    await asOtherSales(() => createLead({ name: 'Theirs' }));

    expect((await asSales(() => listLeads())).map((lead) => lead.name)).toEqual(['Mine']);
    expect(await asSales(() => listLeads({ ownerId: String(otherSalesId) }))).toHaveLength(1);
    expect(await asManager(() => listLeads())).toHaveLength(2);
    expect(await asManager(() => listLeads({ ownerId: String(otherSalesId) }))).toHaveLength(1);

    const theirs = (await asManager(() => listLeads())).find((lead) => lead.name === 'Theirs');
    await expect(asSales(() => updateLead(theirs!.id, { name: 'Taken' }))).rejects.toThrow(
      'Lead not found',
    );
  });

  it('refuses a person without lead.manage', async () => {
    const readerId = new Types.ObjectId();
    await UserModel.create({
      _id: readerId,
      tenantId,
      name: 'Reader',
      email: 'r@x.com',
      role: 'agent',
      status: 'active',
    });

    await expect(runWithContext(as(readerId), () => createLead({ name: 'Nope' }))).rejects.toThrow(
      'may not change leads',
    );
  });

  it('warns about a duplicate lead, customer or contact and lets the person save anyway', async () => {
    await asManager(() => createLead({ name: 'First', email: 'dup@x.com', company: 'Acme LLC' }));

    const error = await asManager(() => createLead({ name: 'Second', email: 'DUP@x.com' })).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(DuplicateLeadError);
    expect((error as DuplicateLeadError).duplicates[0]?.reasons).toEqual(['email']);

    await expect(
      asManager(() => createLead({ name: 'Third', company: 'ACME' })),
    ).rejects.toBeInstanceOf(DuplicateLeadError);

    await asManager(async () => {
      const organisationId = await createOrganisation({ name: 'Known Clinic', kind: 'client' });
      await createContact({
        organisationId,
        name: 'Known Person',
        email: 'known@x.com',
        mobile: '+971555000111',
      });
    });
    await expect(
      asManager(() => createLead({ name: 'Fourth', email: 'known@x.com' })),
    ).rejects.toBeInstanceOf(DuplicateLeadError);
    await expect(
      asManager(() => createLead({ name: 'Fifth', company: 'known clinic' })),
    ).rejects.toBeInstanceOf(DuplicateLeadError);

    await asManager(() =>
      createLead({ name: 'Second', email: 'dup@x.com' }, { confirmDuplicates: true }),
    );
    expect(await asManager(() => listLeads())).toHaveLength(2);
  });

  it('only accepts sources from the tenant list, and an active owner', async () => {
    await expect(
      asManager(() => createLead({ name: 'X', source: 'Carrier pigeon' })),
    ).rejects.toThrow('listed sources');
    await expect(
      asManager(() => createLead({ name: 'X', ownerId: String(new Types.ObjectId()) })),
    ).rejects.toThrow('active member');

    await TenantModel.updateOne({ _id: tenantId }, { $set: { leadSources: ['Trade show'] } });
    await asManager(() => createLead({ name: 'Y', source: 'Trade show' }));
  });

  it('requires a reason to disqualify, keeps the lead and can reopen it', async () => {
    const id = await asManager(() => createLead({ name: 'Cold lead' }));

    await expect(asManager(() => disqualifyLead(id, '  '))).rejects.toThrow('Say why');
    await asManager(() => startWorkingLead(id));
    await asManager(() => disqualifyLead(id, 'No budget'));

    const [lead] = await asManager(() => listLeads({ status: 'disqualified' }));
    expect(lead?.disqualifiedReason).toBe('No budget');

    await expect(asManager(() => disqualifyLead(id, 'Again'))).rejects.toThrow(
      'still being worked',
    );

    await asManager(() => startWorkingLead(id));
    const [reopened] = await asManager(() => listLeads({ status: 'working' }));
    expect(reopened?.disqualifiedReason).toBeNull();
  });

  it('archives a lead out of the list without deleting it', async () => {
    const id = await asManager(() => createLead({ name: 'Gone' }));
    await asManager(() => archiveLead(id));

    expect(await asManager(() => listLeads())).toHaveLength(0);
  });

  it('never shows one tenant the leads of another', async () => {
    await asManager(() => createLead({ name: 'Ours' }));

    const otherTenant = new Types.ObjectId();
    const found = await runWithContext(as(managerId, otherTenant), () => listLeads());
    expect(found).toHaveLength(0);
  });
});

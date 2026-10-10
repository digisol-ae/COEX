import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { TenantModel } from '@/modules/core/models/tenant.model';
import { UserModel } from '@/modules/core/models/user.model';
import { createOrganisation } from '@/modules/crm/services/organisation.service';
import { OrganisationModel } from '@/modules/crm/models/organisation.model';
import { ContactModel } from '@/modules/crm/models/contact.model';
import { ActivityModel } from '@/modules/crm/models/activity.model';
import { listOpportunities } from '@/modules/crm/services/opportunity.service';
import { createContact } from '@/modules/crm/services/contact.service';
import {
  DuplicateLeadError,
  archiveLead,
  convertLead,
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

  it('converts a lead into a prospect customer, a contact and an opportunity, and keeps the lead', async () => {
    const id = await asSales(() =>
      createLead({
        name: 'Dr Amal',
        company: 'Amal Dental',
        email: 'amal@x.com',
        mobile: '050 123 4567',
        source: 'Referral',
        notes: 'Met at the expo',
      }),
    );

    const result = await asManager(() =>
      convertLead(id, { opportunity: { title: 'R4+ rollout', oneOff: '5,000' } }),
    );

    const organisation = await OrganisationModel.findById(result.organisationId);
    expect(organisation?.name).toBe('Amal Dental');
    expect(organisation?.kind).toBe('prospect');
    expect(String(organisation?.ownerId)).toBe(String(salesId));

    const contact = await ContactModel.findById(result.contactId);
    expect(contact?.email).toBe('amal@x.com');
    expect(contact?.mobile).toBe('+971501234567');
    expect(contact?.isPrimary).toBe(true);

    const [deal] = await asManager(() => listOpportunities());
    expect(deal?.title).toBe('R4+ rollout');
    expect(deal?.ownerId).toBe(String(salesId));
    expect(deal?.oneOffMinorUnits).toBe(500000);

    const note = await ActivityModel.findOne({
      organisationId: result.organisationId,
      kind: 'note',
    });
    expect(note?.summary).toContain('Converted from lead L-1');
    expect(note?.body).toBe('Met at the expo');

    const [converted] = await asManager(() => listLeads({ status: 'converted' }));
    expect(converted?.convertedOrganisationId).toBe(result.organisationId);
    await expect(asManager(() => convertLead(id, {}))).rejects.toThrow('still being worked');
    await expect(asManager(() => updateLead(id, { name: 'Edited' }))).rejects.toThrow('converted');
  });

  it('adds the lead to an existing customer and reuses a contact with the same email', async () => {
    const { organisationId, contactId } = await asManager(async () => {
      const organisationId = await createOrganisation({ name: 'Known Clinic', kind: 'client' });
      const contactId = await createContact({
        organisationId,
        name: 'Known Person',
        email: 'known@x.com',
      });
      return { organisationId, contactId };
    });

    const id = await asManager(() =>
      createLead({ name: 'Known P', email: 'known@x.com' }, { confirmDuplicates: true }),
    );
    const result = await asManager(() => convertLead(id, { organisationId }));

    expect(result.organisationId).toBe(organisationId);
    expect(result.contactId).toBe(contactId);
    expect(await ContactModel.countDocuments({ organisationId })).toBe(1);
    expect(result.opportunityId).toBeNull();
  });

  it('needs permission to manage customers, and refuses a lead that is not open', async () => {
    const id = await asSales(() => createLead({ name: 'Needs customer rights' }));

    // The salesperson holds lead.manage only, not customer.manage.
    await expect(asSales(() => convertLead(id, {}))).rejects.toThrow('manage customers');

    await asManager(() => disqualifyLead(id, 'No budget'));
    await expect(asManager(() => convertLead(id, {}))).rejects.toThrow('still being worked');
  });
});

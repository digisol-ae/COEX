import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { UserModel } from '@coex/shared/core/models/user.model';
import { listStaffUsers, assertStaffAdditions } from '@/modules/core/services/staff.service';
import { updateUserAccess, updateUserRole, listUsers } from '@/modules/core/services/user.service';
import {
  createOrganisation,
  listOrganisations,
  listOrganisationChoices,
} from '@/modules/crm/services/organisation.service';
import { ContactModel } from '@coex/shared/crm/models/contact.model';
import { LocationModel } from '@coex/shared/crm/models/location.model';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { TaskModel } from '@coex/shared/tasks/models/task.model';
import { createSpace } from '@/modules/tasks/services/space.service';
import { assignTicket } from '@/modules/tickets/services/ticket.service';
import { TicketModel } from '@coex/shared/tickets/models/ticket.model';
import { createTask } from '@/modules/tasks/services/task.service';
import { loadDashboard } from '@/modules/tasks/services/dashboard.service';
const context = {
  tenantId: new Types.ObjectId(),
  userId: new Types.ObjectId(),
  isPlatformAdmin: false,
};
const inside = <T>(work: () => Promise<T>) => runWithContext(context, work);
beforeAll(async () => {
  await connectForTests('application_performance');
  await clearDatabase();
});
afterAll(disconnectFromTests);
describe('application account lookup boundary', () => {
  it('returns twelve staff instead of 432 accounts while staff and customer administration stay separate', async () => {
    await UserModel.insertMany(
      Array.from({ length: 432 }, (_, i) => ({
        tenantId: context.tenantId,
        name: `Person ${i}`,
        email: `person${i}@example.test`,
        role: i < 12 ? 'agent' : 'client_contact',
        status: i === 11 ? 'suspended' : 'active',
      })),
    );
    await UserModel.create({
      tenantId: new Types.ObjectId(),
      name: 'Other tenant',
      email: 'other@example.test',
      role: 'agent',
    });
    await UserModel.collection.insertOne({
      tenantId: context.tenantId,
      name: 'Unrecognised imported account',
      email: 'unknown@example.test',
      role: 'customer',
      status: 'active',
      deletedAt: null,
    });
    await UserModel.create({
      tenantId: context.tenantId,
      name: 'Deleted staff',
      email: 'deleted@example.test',
      role: 'agent',
      deletedAt: new Date(),
    });
    await inside(async () => {
      const staff = await listStaffUsers();
      expect(staff).toHaveLength(12);
      expect(Object.keys(staff[0]).sort()).toEqual(['email', 'id', 'name', 'role', 'status']);
      expect(await listStaffUsers({ activeOnly: true })).toHaveLength(11);
      expect(await listUsers()).toHaveLength(12);
      expect(await listUsers({ kind: 'customers' })).toHaveLength(420);
      await expect(assertStaffAdditions([staff[0].id])).resolves.toBeUndefined();
      const inactive = staff.find((user) => user.status === 'suspended')!;
      await expect(assertStaffAdditions([inactive.id])).rejects.toThrow('active staff');
      await expect(assertStaffAdditions([inactive.id], [inactive.id])).resolves.toBeUndefined();
      const customer = await UserModel.findOne({
        tenantId: context.tenantId,
        role: 'client_contact',
      });
      await expect(assertStaffAdditions([String(customer!._id)])).rejects.toThrow('active staff');
      await expect(
        assertStaffAdditions([String(customer!._id)], [String(customer!._id)]),
      ).rejects.toThrow('active staff');
      await expect(assertStaffAdditions([String(new Types.ObjectId())])).rejects.toThrow(
        'active staff',
      );
    });
  });
  it('customer search escapes punctuation and returns lightweight choices', async () =>
    inside(async () => {
      await createOrganisation({ name: 'Customer (A)+', kind: 'client' });
      await createOrganisation({ name: 'Customer AAA', kind: 'client' });
      const choices = await listOrganisationChoices({ search: '(A)+', limit: 20 });
      expect(choices.map((row) => row.name)).toEqual(['Customer (A)+']);
      expect(Object.keys(choices[0]).sort()).toEqual(['id', 'kind', 'name', 'status']);
    }));
  it('batches customer counts and preserves tenant and deletion boundaries', async () =>
    inside(async () => {
      const id = await createOrganisation({ name: 'Counted customer', kind: 'client' });
      await ContactModel.insertMany([
        { tenantId: context.tenantId, organisationId: id, name: 'Included' },
        { tenantId: context.tenantId, organisationId: id, name: 'Deleted', deletedAt: new Date() },
        { tenantId: new Types.ObjectId(), organisationId: id, name: 'Foreign' },
      ]);
      await LocationModel.create({ tenantId: context.tenantId, organisationId: id, name: 'Site' });
      const contacts = vi.spyOn(ContactModel, 'aggregate');
      const locations = vi.spyOn(LocationModel, 'aggregate');
      const perContact = vi.spyOn(ContactModel, 'countDocuments');
      const perLocation = vi.spyOn(LocationModel, 'countDocuments');
      try {
        const rows = await listOrganisations();
        expect(rows.find((row) => row.id === id)).toMatchObject({
          contactCount: 1,
          locationCount: 1,
        });
        expect(contacts).toHaveBeenCalledTimes(1);
        expect(locations).toHaveBeenCalledTimes(1);
        expect(perContact).not.toHaveBeenCalled();
        expect(perLocation).not.toHaveBeenCalled();
      } finally {
        vi.restoreAllMocks();
      }
    }));
  it('keeps dashboard count queries bounded with 432 accounts and respects the selected agent', async () =>
    inside(async () => {
      await TenantModel.create({
        _id: context.tenantId,
        name: 'Performance QA',
        slug: 'performance-qa',
      });
      const staff = await listStaffUsers({ activeOnly: true });
      const spaceId = await createSpace({ name: 'Performance project' });
      await createTask({ spaceId, title: 'Shared task', assigneeIds: [staff[0].id, staff[1].id] });
      await createTask({ spaceId, title: 'Other agent task', assigneeIds: [staff[1].id] });
      const counts = vi.spyOn(TaskModel, 'countDocuments');
      try {
        const dashboard = await loadDashboard({ onlyAssigneeId: staff[0].id });
        expect(dashboard.tiles.open).toBe(1);
        expect(dashboard.bySpace).toEqual([expect.objectContaining({ id: spaceId, count: 1 })]);
        expect(dashboard.byAssignee).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: staff[0].id, count: 1 }),
            expect.objectContaining({ id: staff[1].id, count: 1 }),
          ]),
        );
        expect(counts).toHaveBeenCalledTimes(5);
      } finally {
        vi.restoreAllMocks();
      }
    }));
  it('blocks customer IDs in real task/ticket assignments and staff role conversion', async () =>
    inside(async () => {
      const customer = await UserModel.findOne({
        tenantId: context.tenantId,
        role: 'client_contact',
      });
      const customerId = String(customer!._id);
      const spaceId = await createSpace({ name: 'Staff separation regression' });
      await expect(
        createTask({ spaceId, title: 'Must reject customer', assigneeIds: [customerId] }),
      ).rejects.toThrow('active staff');
      const ticket = await TicketModel.create({
        tenantId: context.tenantId,
        queueId: new Types.ObjectId(),
        number: 'BOUNDARY-1',
        subject: 'Assignment boundary',
      });
      await expect(assignTicket(String(ticket._id), customerId)).rejects.toThrow('active staff');
      expect((await TicketModel.findById(ticket._id))?.assigneeId).toBeNull();
      await expect(updateUserRole(customerId, 'agent')).rejects.toThrow('managed separately');
      expect((await UserModel.findById(customerId))?.role).toBe('client_contact');
      await expect(
        updateUserAccess(customerId, { grants: ['task.manage'], denials: [] }),
      ).rejects.toThrow('managed separately');
      const staff = (await listStaffUsers({ activeOnly: true }))[0];
      await expect(updateUserRole(staff.id, 'client_contact')).rejects.toThrow(
        'managed separately',
      );
    }));
});

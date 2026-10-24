/** Integration verification against synthetic records in Docker only. */
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { SpaceModel } from '@coex/shared/tasks/models/space.model';
import { TaskModel } from '@coex/shared/tasks/models/task.model';
import { TicketMessageModel } from '@coex/shared/tickets/models/ticket-message.model';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { runWithContext } from '../apps/web/src/lib/tenant-context';
import { UserModel } from '@coex/shared/core/models/user.model';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import {
  transfer,
  exportRecords,
  assertTransferAccess,
} from '../apps/web/src/modules/data-transfer/service';
import { parseCsv, toCsv } from '../apps/web/src/modules/data-transfer/csv';
import { ENTITIES, columns, type Entity } from '../apps/web/src/modules/data-transfer/spec';
import { ImportLockModel } from '../apps/web/src/modules/data-transfer/import-lock.model';
async function main() {
  const uri = new URL(process.env.MONGODB_URI ?? '');
  if (
    !existsSync('/.dockerenv') ||
    uri.hostname !== 'mongo' ||
    uri.pathname !== '/coex_docker_local'
  )
    throw Error('Docker local database only.');
  await mongoose.connect(uri.toString());
  const actor = await UserModel.findOne({ email: 'docker-admin@example.test', deletedAt: null });
  assert(actor);
  await runWithContext(
    { tenantId: actor.tenantId, userId: actor._id, isPlatformAdmin: true },
    async () => {
      const samples: Record<Entity, Record<string, string>> = {
        customers: { name: 'Docker QA Import Customer', email: 'docker-import@example.test' },
        products: { name: 'Docker QA Import Product', code: 'DOCKER-QA-IMPORT', price: '99.95' },
        leads: { name: 'Docker QA Import Lead', email: 'docker-lead@example.test' },
        tasks: {
          title: 'Docker QA CSV import task',
          space: 'Docker QA Test Workspace',
          customer: 'Docker QA Import Customer',
        },
        tickets: {
          subject: 'Docker QA CSV import ticket',
          queue: 'Docker QA Support',
          body: 'Synthetic CSV import opening message.',
          customer: 'Docker QA Import Customer',
        },
        contracts: {
          title: 'Docker QA CSV import contract',
          customer: 'Docker QA Import Customer',
          startDate: '2026-10-23',
          endDate: '2027-10-22',
          value: '100.50',
          productCodes: 'DOCKER-QA-IMPORT',
        },
      };
      const tag = Date.now().toString(36) + randomBytes(2).toString('hex');
      samples.customers.name += ' ' + tag;
      samples.customers.email = `docker-import-${tag}@example.test`;
      samples.products.name += ' ' + tag;
      samples.products.code = 'DOCKER-QA-' + tag.toUpperCase();
      samples.leads.name += ' ' + tag;
      samples.leads.email = `docker-lead-${tag}@example.test`;
      samples.tasks.title += ' ' + tag;
      samples.tickets.subject += ' ' + tag;
      samples.contracts.title += ' ' + tag;
      for (const entity of ['tasks', 'tickets', 'contracts'] as const)
        samples[entity].customer = samples.customers.name;
      samples.contracts.productCodes = samples.products.code;
      const modelNames = {
        customers: 'Organisation',
        products: 'Product',
        leads: 'Lead',
        tasks: 'Task',
        tickets: 'Ticket',
        contracts: 'Contract',
      };
      const count = (entity: Entity) =>
        mongoose
          .model(modelNames[entity])
          .countDocuments({ tenantId: actor.tenantId, deletedAt: null });
      for (const entity of [
        'customers',
        'products',
        'leads',
        'tasks',
        'tickets',
        'contracts',
      ] as Entity[]) {
        const csv = toCsv(columns(entity), [samples[entity]]);
        const before = await count(entity);
        const preview = await transfer(entity, csv);
        assert.equal(await count(entity), before, 'Preview must not create records');
        assert.equal(preview.rows[0].status, 'ready');
        assert(preview.proof);
        assert(!preview.rows.some((r) => r.status === 'invalid'));
        // No preview is valid for modified contents.
        await assert.rejects(() => transfer(entity, csv + '\n', preview.proof), /changed/);
        const result = await transfer(entity, csv, preview.proof);
        assert(result.committed);
        assert.equal(result.rows[0].status, 'created');
        assert.equal(await count(entity), before + 1);
        await assert.rejects(() => transfer(entity, csv, '0.' + '0'.repeat(64)), /expired/);
        const again = await transfer(entity, csv);
        assert.equal(again.rows[0].status, 'duplicate');
        const replay = await transfer(entity, csv, again.proof);
        assert(replay.committed);
        assert.equal(await count(entity), before + 1);
        const exported = parseCsv(await exportRecords(entity));
        const label = samples[entity].name || samples[entity].title || samples[entity].subject;
        assert(exported.some((r) => r.name === label || r.title === label || r.subject === label));
        if (entity === 'products')
          assert(exported.some((r) => r.code === samples.products.code && r.price === '99.95'));
        if (entity === 'contracts')
          assert(exported.some((r) => r.title === samples.contracts.title && r.value === '100.50'));
        console.log('PASS', entity, 'preview, import, duplicate skipping, export');
      }
      // Mixed valid/invalid files must not allow a partial commit at preview.
      const beforeCustomers = await count('customers');
      const mixed = await transfer(
        'customers',
        toCsv(
          ['name', 'email'],
          [
            { name: 'Docker QA Mixed ' + tag, email: 'mixed@example.test' },
            { name: '', email: 'invalid' },
          ],
        ),
      );
      assert(!mixed.proof);
      assert(mixed.error);
      assert.equal(await count('customers'), beforeCustomers);
      const repeated = toCsv(
        ['name', 'email'],
        [
          { name: 'Docker QA Repeated ' + tag, email: `repeat-${tag}@example.test` },
          { name: 'Docker QA Repeated ' + tag, email: `repeat-${tag}@example.test` },
        ],
      );
      const repeatedPreview = await transfer('customers', repeated);
      assert.equal(repeatedPreview.rows[1].status, 'duplicate');
      const repeatedResult = await transfer('customers', repeated, repeatedPreview.proof);
      assert.equal(repeatedResult.rows.filter((r) => r.status === 'created').length, 1);
      // An administrator must still not export another person's personal tasks.
      const privateSpace = await SpaceModel.create({
        tenantId: actor.tenantId,
        name: 'Docker QA Private ' + tag,
        isPersonal: true,
        ownerId: new mongoose.Types.ObjectId(),
      });
      const privateTask = await TaskModel.create({
        tenantId: actor.tenantId,
        spaceId: privateSpace._id,
        title: 'Docker QA Hidden ' + tag,
        number: 'QA-PRIVATE-' + tag,
        status: 'To do',
      });
      const taskExport = await exportRecords('tasks');
      assert(!taskExport.includes(String(privateTask._id)));
      assert(!taskExport.includes(privateTask.title));
      // Internal ticket messages must never appear in the core-field export.
      const ticket = await mongoose
        .model('Ticket')
        .findOne({ tenantId: actor.tenantId, subject: samples.tickets.subject });
      assert(ticket);
      const secret = 'Docker QA INTERNAL ' + tag;
      await TicketMessageModel.create({
        tenantId: actor.tenantId,
        ticketId: ticket._id,
        visibility: 'internal',
        direction: 'outbound',
        body: secret,
        authorUserId: actor._id,
        authorName: 'Docker QA',
        channel: 'agent',
      });
      assert(!(await exportRecords('tickets')).includes(secret));
      const deniedUser = await UserModel.create({
        tenantId: actor.tenantId,
        email: `docker-denied-${tag}@example.test`,
        name: 'Docker QA Restricted Administrator',
        role: 'tenant_admin',
        status: 'active',
        permissionDenials: ['customer.manage', 'task.read.all'],
      });
      try {
        await runWithContext(
          { tenantId: actor.tenantId, userId: deniedUser._id, isPlatformAdmin: false },
          async () => {
            await assert.rejects(() => assertTransferAccess('customers', true), /permission/);
            await assert.rejects(() => exportRecords('tasks'), /permission/);
            await assertTransferAccess('customers');
          },
        );
      } finally {
        await UserModel.updateOne(
          { _id: deniedUser._id, tenantId: actor.tenantId },
          { $set: { status: 'inactive' } },
        );
      }
      console.log(
        'PASS real-account permission denials, mixed-file no-write, repeated rows, personal-task privacy, internal-ticket privacy',
      );
      const invalid = toCsv(columns('contracts'), [
        { ...samples.contracts, title: 'Docker QA INVALID Contract', customer: 'DOES NOT EXIST' },
      ]);
      const refused = await transfer('contracts', invalid);
      assert(!refused.proof);
      assert.equal(refused.rows[0].status, 'invalid');
      // Hold the same tenant/module lock to prove a concurrent commit is refused.
      const csv = toCsv(columns('customers'), [{ name: 'Docker QA Locked Import' }]);
      const preview = await transfer('customers', csv);
      assert(preview.proof);
      const lockId = `${actor.tenantId}:customers`;
      await ImportLockModel.create({
        _id: lockId,
        tenantId: actor.tenantId,
        token: 'qa-lock',
        expiresAt: new Date(Date.now() + 60000),
      });
      try {
        await assert.rejects(() => transfer('customers', csv, preview.proof), /Another import/);
      } finally {
        await ImportLockModel.deleteOne({
          _id: lockId,
          tenantId: actor.tenantId,
          token: 'qa-lock',
        });
      }
      assert.equal(
        await OrganisationModel.countDocuments({
          tenantId: actor.tenantId,
          name: 'Docker QA Locked Import',
        }),
        0,
      );
      // A second tenant cannot resolve a customer from the first tenant.
      await runWithContext(
        { tenantId: new mongoose.Types.ObjectId(), userId: actor._id, isPlatformAdmin: true },
        async () => {
          const result = await transfer(
            'contracts',
            toCsv(columns('contracts'), [samples.contracts]),
          );
          assert.equal(result.rows[0].status, 'invalid');
        },
      );
      console.log(
        'PASS invalid references, preview tampering, concurrent import lock, cross-tenant isolation',
      );
      assert.equal(ENTITIES.length, 6);
    },
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());

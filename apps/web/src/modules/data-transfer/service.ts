import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { getContext } from '@/lib/tenant-context';
import { actorCan } from '@/modules/crm/services/access.service';
import { recordAudit } from '@/modules/core/services/audit.service';
import { createTask, listTasks } from '@/modules/tasks/services/task.service';
import { listSpaces } from '@/modules/tasks/services/space.service';
import { createTicket } from '@/modules/tickets/services/ticket.service';
import { createOrganisation } from '@/modules/crm/services/organisation.service';
import {
  createLead,
  findLeadDuplicates,
  listLeadSources,
} from '@/modules/crm/services/lead.service';
import { createProduct } from '@/modules/crm/services/product.service';
import { createContract } from '@/modules/crm/services/contract.service';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import { ProductModel } from '@coex/shared/crm/models/product.model';
import { ContractModel } from '@coex/shared/crm/models/contract.model';
import { LeadModel } from '@coex/shared/crm/models/lead.model';
import { TaskModel } from '@coex/shared/tasks/models/task.model';
import { QueueModel } from '@coex/shared/tickets/models/queue.model';
import { TicketModel } from '@coex/shared/tickets/models/ticket.model';
import { TicketMessageModel } from '@coex/shared/tickets/models/ticket-message.model';
import type { Permission } from '@coex/shared/core/permissions';
import { columns, metadataColumns, schemas, validateRow, type Entity } from './spec';
import { parseCsv, toCsv } from './csv';
import { ImportLockModel } from './import-lock.model';

const permissions: Record<Entity, { read: Permission; write: Permission }> = {
  tasks: { read: 'task.read.all', write: 'task.manage' },
  tickets: { read: 'ticket.read.all', write: 'ticket.manage' },
  customers: { read: 'customer.read', write: 'customer.manage' },
  leads: { read: 'lead.read.all', write: 'lead.manage' },
  products: { read: 'products.read', write: 'products.manage' },
  contracts: { read: 'contract.read', write: 'contract.manage' },
};
export async function assertTransferAccess(entity: Entity, write = false) {
  const checks = [
    'tenant.manage',
    permissions[entity].read,
    ...(write ? [permissions[entity].write] : []),
  ] as Permission[];
  for (const permission of checks)
    if (!(await actorCan(permission)))
      throw new Error('You do not have permission to transfer these records.');
}
const match = (value: string) =>
  new RegExp('^' + value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
async function customerId(name: string) {
  if (!name) return undefined;
  const found = await repository(OrganisationModel)
    .find({ name: match(name) })
    .limit(2);
  if (found.length !== 1)
    throw new Error(
      `Customer "${name}" must match exactly one existing customer. Import customers first.`,
    );
  return String(found[0]._id);
}
interface Prepared {
  key: string;
  label: string;
  exists: () => Promise<boolean>;
  create: () => Promise<string>;
}
async function prepare(entity: Entity, raw: Record<string, string>): Promise<Prepared> {
  const input = validateRow(entity, raw);
  switch (entity) {
    case 'customers': {
      const d = schemas.customers.parse(input);
      return {
        key: d.email.toLowerCase() || d.name.toLowerCase(),
        label: d.name,
        exists: async () =>
          !!(await repository(OrganisationModel).findOne({
            $or: [{ name: match(d.name) }, ...(d.email ? [{ email: match(d.email) }] : [])],
          })),
        create: () => createOrganisation(d),
      };
    }
    case 'products': {
      const d = schemas.products.parse(input);
      return {
        key: d.code.toUpperCase(),
        label: d.name,
        exists: async () =>
          !!(await repository(ProductModel).findOne({ code: d.code.toUpperCase() })),
        create: () => createProduct(d),
      };
    }
    case 'leads': {
      const d = schemas.leads.parse(input);
      if (d.source && !(await listLeadSources()).includes(d.source))
        throw new Error('source must match a configured lead source, or be blank.');
      return {
        key: d.email.toLowerCase() || `${d.name}|${d.company}`.toLowerCase(),
        label: d.name,
        exists: async () =>
          !!(await repository(LeadModel).findOne({
            name: match(d.name),
            company: d.company || null,
          })) || (await findLeadDuplicates(d)).length > 0,
        create: () => createLead(d),
      };
    }
    case 'tasks': {
      const d = schemas.tasks.parse(input);
      const spaces = (await listSpaces()).filter(
        (s) => s.name.toLowerCase() === d.space.toLowerCase() && s.status === 'active',
      );
      if (spaces.length !== 1)
        throw new Error('space must match exactly one active, visible shared Space.');
      const spaceId = spaces[0].id,
        organisationId = await customerId(d.customer);
      return {
        key: `${spaceId}|${d.title}`.toLowerCase(),
        label: d.title,
        exists: async () =>
          !!(await repository(TaskModel).findOne({ spaceId, title: match(d.title) })),
        create: () =>
          createTask({
            title: d.title,
            description: d.description,
            priority: d.priority,
            spaceId,
            organisationId,
            startAt: d.startAt || null,
            endAt: d.endAt || null,
            estimateMinutes: d.estimateMinutes ? Number(d.estimateMinutes) : null,
          }),
      };
    }
    case 'tickets': {
      const d = schemas.tickets.parse(input);
      const queues = await repository(QueueModel)
        .find({ name: match(d.queue), status: 'active' })
        .limit(2);
      if (queues.length !== 1)
        throw new Error('queue must match exactly one active support queue.');
      const queueId = String(queues[0]._id),
        organisationId = await customerId(d.customer);
      return {
        key: `${queueId}|${d.subject}`.toLowerCase(),
        label: d.subject,
        exists: async () =>
          !!(await repository(TicketModel).findOne({ queueId, subject: match(d.subject) })),
        create: async () =>
          (
            await createTicket({
              subject: d.subject,
              body: d.body,
              priority: d.priority,
              queueId,
              organisationId,
              channel: 'agent',
              onBehalfOfCustomer: true,
            })
          ).id,
      };
    }
    case 'contracts': {
      const d = schemas.contracts.parse(input),
        organisationId = await customerId(d.customer);
      const codes = [
        ...new Set(
          d.productCodes
            .split('|')
            .map((v) => v.trim().toUpperCase())
            .filter(Boolean),
        ),
      ];
      const products = await repository(ProductModel).find({
        code: { $in: codes },
        status: 'active',
      });
      if (products.length !== codes.length)
        throw new Error(
          'productCodes must match active product codes, separated by |. Import products first.',
        );
      const { customer: _customer, productCodes: _codes, ...fields } = d;
      void _customer;
      void _codes;
      return {
        key: `${organisationId}|${d.title}|${d.startDate}|${d.endDate}`.toLowerCase(),
        label: d.title,
        exists: async () =>
          !!(await repository(ContractModel).findOne({
            organisationId,
            title: match(d.title),
            startDate: d.startDate,
            endDate: d.endDate,
          })),
        create: () =>
          createContract({
            ...fields,
            organisationId: organisationId!,
            productIds: products.map((p) => String(p._id)),
          }),
      };
    }
  }
}
export interface TransferRow {
  record: number;
  label: string;
  status: 'ready' | 'duplicate' | 'invalid' | 'created' | 'failed';
  message: string;
}
export interface TransferResult {
  rows: TransferRow[];
  proof?: string;
  error?: string;
  committed?: boolean;
}
function signature(entity: Entity, csv: string, timestamp: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('Set AUTH_SECRET before using imports.');
  const context = getContext();
  return createHmac('sha256', secret)
    .update(
      JSON.stringify([String(context.tenantId), String(context.userId), entity, timestamp, csv]),
    )
    .digest('hex');
}
export async function transfer(
  entity: Entity,
  csv: string,
  proof?: string,
): Promise<TransferResult> {
  await assertTransferAccess(entity, true);
  await connectToDatabase();
  const parsed = parseCsv(csv); // Enforce size and record limits before hashing or writing.
  if (proof) {
    const [stamp, mac] = proof.split('.');
    if (
      !/^\d+$/.test(stamp ?? '') ||
      !/^[a-f0-9]{64}$/.test(mac ?? '') ||
      Date.now() - Number(stamp) > 15 * 60 * 1000 ||
      Number(stamp) > Date.now()
    )
      throw new Error('Preview expired. Preview the file again.');
    if (
      !timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(signature(entity, csv, stamp), 'hex'))
    )
      throw new Error('File changed. Preview it again.');
  }
  const prepared: (Prepared | null)[] = [],
    rows: TransferRow[] = [],
    seen = new Set<string>();
  for (let i = 0; i < parsed.length; i++) {
    try {
      const item = await prepare(entity, parsed[i]);
      const duplicate = seen.has(item.key) || (await item.exists());
      seen.add(item.key);
      prepared.push(duplicate ? null : item);
      rows.push({
        record: i + 1,
        label: item.label,
        status: duplicate ? 'duplicate' : 'ready',
        message: duplicate
          ? 'Skipped: matching record already exists or is repeated in this file.'
          : 'Ready to create',
      });
    } catch (e) {
      prepared.push(null);
      rows.push({
        record: i + 1,
        label: parsed[i].name || parsed[i].title || parsed[i].subject || '',
        status: 'invalid',
        message: e instanceof Error ? e.message : 'Invalid record',
      });
    }
  }
  if (rows.some((r) => r.status === 'invalid'))
    return { rows, error: 'Fix the invalid records and preview again. Nothing was imported.' };
  if (!proof) {
    const stamp = String(Date.now());
    return { rows, proof: stamp + '.' + signature(entity, csv, stamp) };
  }
  const context = getContext();
  const lockId = `${context.tenantId}:${entity}`,
    lockToken = randomUUID();
  try {
    await ImportLockModel.create({
      _id: lockId,
      tenantId: context.tenantId,
      token: lockToken,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000)
      throw new Error(
        'Another import for these records is running. Preview again when it finishes.',
      );
    throw error;
  }
  try {
    // Recheck each duplicate immediately before creating. Existing records are never updated.
    for (let i = 0; i < prepared.length; i++) {
      const item = prepared[i];
      if (!item) continue;
      try {
        if (await item.exists()) {
          rows[i].status = 'duplicate';
          rows[i].message = 'Skipped: matching record now exists.';
          continue;
        }
        await item.create();
        rows[i].status = 'created';
        rows[i].message = 'Created';
      } catch (e) {
        rows[i].status = 'failed';
        rows[i].message = e instanceof Error ? e.message : 'Could not create record';
      }
    }
    await recordAudit({
      action: 'data.imported',
      entityType: 'DataTransfer',
      after: {
        entity,
        created: rows.filter((r) => r.status === 'created').length,
        skipped: rows.filter((r) => r.status === 'duplicate').length,
        failed: rows.filter((r) => r.status === 'failed').length,
      },
    });
    return { rows, committed: true };
  } finally {
    await ImportLockModel.deleteOne({ _id: lockId, tenantId: context.tenantId, token: lockToken });
  }
}

/** Explicit core-field allowlists; no sessions, credentials, private notes or attachments. */
export async function exportRecords(entity: Entity): Promise<string> {
  await assertTransferAccess(entity);
  await connectToDatabase();
  const orgs = await repository(OrganisationModel).find().select('name');
  const names = new Map(orgs.map((o) => [String(o._id), o.name]));
  let rows: Record<string, unknown>[];
  switch (entity) {
    case 'customers':
      rows = (await repository(OrganisationModel).find().limit(10001)).map((d) => ({
        _id: d._id,
        _status: d.status,
        name: d.name,
        kind: d.kind,
        email: d.email,
        phone: d.phone,
        industry: d.industry,
        website: d.website,
        address: d.address,
        country: d.country,
        notes: d.notes,
      }));
      break;
    case 'leads':
      rows = (await repository(LeadModel).find().limit(10001)).map((d) => ({
        _id: d._id,
        _number: d.number,
        _status: d.status,
        _owner: d.ownerId,
        name: d.name,
        company: d.company,
        email: d.email,
        mobile: d.mobile,
        mobileCountry: '',
        source: d.source,
        notes: d.notes,
      }));
      break;
    case 'products':
      rows = (await repository(ProductModel).find().limit(10001)).map((d) => ({
        _id: d._id,
        _status: d.status,
        name: d.name,
        code: d.code,
        kind: d.kind,
        description: d.description,
        price: d.listPriceMinorUnits == null ? '' : (d.listPriceMinorUnits / 100).toFixed(2),
        currency: d.currency,
        billingPeriod: d.billingPeriod,
      }));
      break;
    case 'contracts': {
      const products = await repository(ProductModel).find().select('code');
      const codes = new Map(products.map((p) => [String(p._id), p.code]));
      rows = (await repository(ContractModel).find().limit(10001)).map((d) => ({
        _id: d._id,
        _number: d.number,
        _status: d.status,
        title: d.title,
        customer: names.get(String(d.organisationId)),
        type: d.type,
        startDate: d.startDate,
        endDate: d.endDate,
        billingFrequency: d.billingFrequency,
        value: (d.valueMinorUnits / 100).toFixed(2),
        currency: d.currency,
        productCodes: d.productIds.map((id) => codes.get(String(id)) ?? '').join('|'),
        documentUrl: d.documentUrl,
        zohoReference: d.zohoReference,
        notes: d.notes,
      }));
      break;
    }
    case 'tasks': {
      const visible = await listTasks({ includeClosed: true });
      if (visible.length > 10000) throw new Error('Export supports at most 10,000 records.');
      const summaries = new Map(visible.map((t) => [t.id, t]));
      rows = (
        await repository(TaskModel).find({
          _id: { $in: visible.map((t) => new Types.ObjectId(t.id)) },
        })
      ).map((d) => ({
        _id: d._id,
        _number: d.number,
        _status: d.status,
        _folder: summaries.get(String(d._id))?.folderName,
        _assignees: summaries.get(String(d._id))?.assigneeNames.join('|'),
        title: d.title,
        space: summaries.get(String(d._id))?.spaceName,
        description: d.description,
        priority: d.priority,
        startAt: d.startAt?.toISOString(),
        endAt: d.endAt?.toISOString(),
        estimateMinutes: d.estimateMinutes,
        customer: names.get(String(d.organisationId)),
      }));
      break;
    }
    case 'tickets': {
      const tickets = await repository(TicketModel).find({ mergedIntoId: null }).limit(10001);
      const queues = await repository(QueueModel).find().select('name');
      const queueNames = new Map(queues.map((q) => [String(q._id), q.name]));
      // One initial public message only. Internal updates and later conversation history stay out.
      const messages = await TicketMessageModel.find({
        tenantId: getContext().tenantId,
        ticketId: { $in: tickets.map((t) => t._id) },
        visibility: 'public',
        deletedAt: null,
      })
        .sort({ createdAt: 1 })
        .select('ticketId body');
      const bodies = new Map<string, string>();
      for (const m of messages)
        if (!bodies.has(String(m.ticketId))) bodies.set(String(m.ticketId), m.body);
      rows = tickets.map((d) => ({
        _id: d._id,
        _number: d.number,
        _status: d.status,
        _assignees: d.assigneeId,
        subject: d.subject,
        queue: queueNames.get(String(d.queueId)),
        body: bodies.get(String(d._id)),
        priority: d.priority,
        customer: names.get(String(d.organisationId)),
      }));
      break;
    }
  }
  if (rows.length > 10000) throw new Error('Export supports at most 10,000 records.');
  await recordAudit({
    action: 'data.exported',
    entityType: 'DataTransfer',
    after: { entity, count: rows.length },
  });
  return toCsv(
    [...columns(entity), ...metadataColumns.filter((c) => rows.some((row) => row[c] != null))],
    rows,
  );
}

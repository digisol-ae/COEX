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
import {
  createOrganisation,
  updateOrganisation,
} from '@/modules/crm/services/organisation.service';
import {
  createLead,
  findLeadDuplicates,
  listLeadSources,
} from '@/modules/crm/services/lead.service';
import { createProduct } from '@/modules/crm/services/product.service';
import { createContract } from '@/modules/crm/services/contract.service';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import { createContact, updateContact } from '@/modules/crm/services/contact.service';
import { ContactModel } from '@coex/shared/crm/models/contact.model';
import { normaliseCompany } from '@coex/shared/crm/lead-rules';
import { normaliseMobile } from '@coex/shared/crm/phone';
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
  contacts: { read: 'customer.read', write: 'customer.manage' },
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
async function customerId(name: string, preferredId?: string) {
  if (preferredId) {
    const customer = await repository(OrganisationModel).findById(preferredId);
    if (!customer || (name && !same(customer.name, name)))
      throw new Error(
        'customerId must refer to an accessible customer and agree with customer when both are supplied.',
      );
    return String(customer._id);
  }
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
export interface TransferMatch {
  id: string;
  label: string;
  reason: string;
  record?: number;
  revision?: string;
  values?: Record<string, string>;
}
export interface TransferDecision {
  action: 'skip' | 'create' | 'update';
  targetId?: string;
}
export type TransferDecisions = Record<string, TransferDecision>;
interface Prepared {
  key: string;
  identities?: string[];
  label: string;
  matches: () => Promise<TransferMatch[]>;
  create: () => Promise<string>;
  update?: (id: string) => Promise<void>;
}
function describeRecord(
  record: { _id: unknown; updatedAt?: Date },
  label: string,
  reason: string,
  values?: Record<string, string>,
): TransferMatch {
  return {
    id: String(record._id),
    label,
    reason,
    revision: record.updatedAt?.toISOString(),
    values,
  };
}
const same = (a: string | null | undefined, b: string) =>
  !!b && a?.toLowerCase() === b.toLowerCase();
const nonEmpty = (raw: Record<string, string>) =>
  Object.fromEntries(Object.entries(raw).filter(([k, v]) => !k.startsWith('_') && v !== ''));
const displayValues = (record: object, keys: string[]) =>
  Object.fromEntries(keys.map((k) => [k, String((record as Record<string, unknown>)[k] ?? '')]));
async function prepare(entity: Entity, raw: Record<string, string>): Promise<Prepared> {
  const input = validateRow(entity, raw);
  switch (entity) {
    case 'customers': {
      const d = schemas.customers.parse(input);
      return {
        key: d.email.toLowerCase() || d.name.toLowerCase(),
        identities: [
          'name:' + d.name.toLowerCase(),
          ...(d.email ? ['email:' + d.email.toLowerCase()] : []),
        ],
        label: d.name,
        matches: async () =>
          (
            await repository(OrganisationModel)
              .find({
                $or: [{ name: match(d.name) }, ...(d.email ? [{ email: match(d.email) }] : [])],
              })
              .sort({ _id: 1 })
          ).map((r) =>
            describeRecord(
              r,
              r.name,
              [same(r.name, d.name) ? 'same name' : '', same(r.email, d.email) ? 'same email' : '']
                .filter(Boolean)
                .join(' and '),
              displayValues(r, columns('customers')),
            ),
          ),
        create: () => createOrganisation(d),
        update: async (id) => {
          const before = await repository(OrganisationModel).findById(id);
          if (!before) throw new Error('Customer no longer exists. Preview again.');
          const fields = schemas.customers.parse({
            ...displayValues(before, columns('customers')),
            ...nonEmpty(raw),
          });
          await updateOrganisation(id, fields);
        },
      };
    }
    case 'contacts': {
      const d = schemas.contacts.parse(input);
      const organisationId = (await customerId(d.customer, d.customerId))!;
      const customerName = (await repository(OrganisationModel).findById(organisationId))!.name;
      const mobile = normaliseMobile(d.mobile, d.country);
      const fields = {
        organisationId,
        name: d.name,
        title: d.title,
        email: d.email,
        mobile: d.mobile,
        country: d.country,
        isPrimary: d.isPrimary === 'true',
      };
      return {
        key: `${organisationId}|${d.name.toLowerCase()}`,
        identities: [
          `${organisationId}|name:${d.name.toLowerCase()}`,
          ...(d.email ? [`${organisationId}|email:${d.email.toLowerCase()}`] : []),
          ...(mobile ? [`${organisationId}|mobile:${mobile}`] : []),
        ],
        label: `${d.name} (${customerName})`,
        matches: async () =>
          (
            await repository(ContactModel)
              .find({
                organisationId,
                $or: [
                  { name: match(d.name) },
                  ...(d.email ? [{ email: match(d.email) }] : []),
                  ...(mobile ? [{ mobile }] : []),
                ],
              })
              .sort({ _id: 1 })
          ).map((r) =>
            describeRecord(
              r,
              `${r.name} (${customerName})`,
              [
                same(r.name, d.name) ? 'same name' : '',
                same(r.email, d.email) ? 'same email' : '',
                mobile && r.mobile === mobile ? 'same mobile' : '',
              ]
                .filter(Boolean)
                .join(' and '),
              {
                ...displayValues(r, columns('contacts')),
                customer: customerName,
                customerId: organisationId,
              },
            ),
          ),
        create: () => createContact(fields),
        update: async (id) => {
          const before = await repository(ContactModel).findOne({ _id: id, organisationId });
          if (!before)
            throw new Error('Contact no longer exists under this customer. Preview again.');
          const merged = schemas.contacts.parse({
            ...displayValues(before, columns('contacts')),
            customer: customerName,
            country: d.country,
            ...nonEmpty(raw),
          });
          await updateContact(id, {
            ...merged,
            organisationId,
            isPrimary: merged.isPrimary === 'true',
          });
        },
      };
    }
    case 'products': {
      const d = schemas.products.parse(input);
      return {
        key: d.code.toUpperCase(),
        label: d.name,
        matches: async () =>
          (
            await repository(ProductModel).find({ code: d.code.toUpperCase() }).sort({ _id: 1 })
          ).map((r) => describeRecord(r, r.name, 'same product code: ' + r.code)),
        create: () => createProduct(d),
      };
    }
    case 'leads': {
      const d = schemas.leads.parse(input);
      if (d.source && !(await listLeadSources()).includes(d.source))
        throw new Error('source must match a configured lead source, or be blank.');
      return {
        key: d.email.toLowerCase() || `${d.name}|${d.company}`.toLowerCase(),
        identities: [
          `name/company:${d.name.toLowerCase()}|${d.company.toLowerCase()}`,
          ...(d.email ? ['email:' + d.email.toLowerCase()] : []),
          ...(d.mobile ? ['mobile:' + normaliseMobile(d.mobile, d.mobileCountry)] : []),
          ...(normaliseCompany(d.company) ? ['company:' + normaliseCompany(d.company)] : []),
        ],
        label: d.name,
        matches: async () => {
          const exact = await repository(LeadModel)
            .find({ name: match(d.name), company: d.company || null })
            .sort({ _id: 1 });
          const matches = exact.map((r) => describeRecord(r, r.name, 'same name and company'));
          for (const r of await findLeadDuplicates(d)) {
            if (!matches.some((m) => m.id === r.id))
              matches.push({
                id: r.id,
                label: r.label,
                reason: `${r.kind}: ${r.reasons.join(', ')}`,
              });
          }
          return matches.sort((a, b) => a.id.localeCompare(b.id));
        },
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
        matches: async () =>
          (
            await repository(TaskModel)
              .find({ spaceId, title: match(d.title) })
              .sort({ _id: 1 })
          ).map((r) => describeRecord(r, r.title, 'same Space and title')),
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
        matches: async () =>
          (
            await repository(TicketModel)
              .find({ queueId, subject: match(d.subject) })
              .sort({ _id: 1 })
          ).map((r) => describeRecord(r, r.subject, 'same queue and subject')),
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
        matches: async () =>
          (
            await repository(ContractModel)
              .find({
                organisationId,
                title: match(d.title),
                startDate: d.startDate,
                endDate: d.endDate,
              })
              .sort({ _id: 1 })
          ).map((r) => describeRecord(r, r.title, 'same customer, title and dates')),
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
  status: 'ready' | 'duplicate' | 'invalid' | 'created' | 'updated' | 'skipped' | 'failed';
  matches?: TransferMatch[];
  incoming?: Record<string, string>;
  decision?: TransferDecision;
  message: string;
}
export interface TransferResult {
  rows: TransferRow[];
  proof?: string;
  error?: string;
  committed?: boolean;
}
function signature(entity: Entity, csv: string, timestamp: string, review: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('Set AUTH_SECRET before using imports.');
  const context = getContext();
  return createHmac('sha256', secret)
    .update(
      JSON.stringify([
        String(context.tenantId),
        String(context.userId),
        entity,
        timestamp,
        csv,
        review,
      ]),
    )
    .digest('hex');
}
export async function transfer(
  entity: Entity,
  csv: string,
  proof?: string,
  decisions: TransferDecisions = {},
): Promise<TransferResult> {
  await assertTransferAccess(entity, true);
  await connectToDatabase();
  const parsed = parseCsv(csv); // Enforce size and record limits before hashing or writing.
  // The proof is checked after recomputing matches, so it also binds the reviewed destinations.
  const prepared: (Prepared | null)[] = [],
    rows: TransferRow[] = [];
  const seen = new Map<string, { record: number; label: string }[]>();
  const updateTargets = new Set<string>();
  for (let i = 0; i < parsed.length; i++) {
    try {
      const item = await prepare(entity, parsed[i]);
      const matches = await item.matches();
      for (const identity of item.identities ?? [item.key]) {
        for (const prior of seen.get(identity) ?? []) {
          const id = `row:${prior.record}`;
          const reason = item.identities
            ? (identity.split(':')[0].split('|').at(-1) ?? 'matching field')
            : 'matching key';
          const existing = matches.find((m) => m.id === id);
          if (existing) {
            if (!existing.reason.includes(reason)) existing.reason += ' and ' + reason;
          } else
            matches.push({
              id,
              label: prior.label,
              record: prior.record,
              reason: 'same ' + reason + ' in this file',
            });
        }
        seen.set(identity, [...(seen.get(identity) ?? []), { record: i + 1, label: item.label }]);
      }
      const decision = decisions[String(i + 1)];
      if (decision && !['skip', 'create', 'update'].includes(decision.action))
        throw new Error('Choose a valid match decision.');
      if (decision?.action === 'create' && entity !== 'customers' && entity !== 'contacts')
        throw new Error(
          'Separate creation is only supported for customers and contacts. Change the matching fields and preview again.',
        );
      if (decision?.action === 'update') {
        if (
          !item.update ||
          !decision.targetId ||
          !matches.some((m) => !m.record && m.id === decision.targetId)
        )
          throw new Error('Choose an existing matching customer or contact to update.');
        if (updateTargets.has(decision.targetId))
          throw new Error(
            'Multiple rows cannot update the same record in one import. Combine them and preview again.',
          );
        updateTargets.add(decision.targetId);
      }
      prepared.push(item);
      rows.push({
        record: i + 1,
        label: item.label,
        matches,
        incoming: nonEmpty(parsed[i]),
        decision,
        status: matches.length ? 'duplicate' : 'ready',
        message: matches.length
          ? decision
            ? `Selected: ${decision.action}${decision.targetId ? ' ' + matches.find((m) => m.id === decision.targetId)?.label : ''}. Review and preview before importing.`
            : 'Review required: choose what to do with these matches.'
          : decision?.action === 'skip'
            ? 'Selected: skip'
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
  if (Object.keys(decisions).some((k) => !/^[1-9]\d*$/.test(k) || Number(k) > parsed.length))
    throw new Error('Invalid row decision. Preview again.');
  if (rows.some((r) => r.status === 'invalid'))
    return { rows, error: 'Fix the invalid records and preview again. Nothing was imported.' };
  const review = JSON.stringify(
    rows.map((r, i) => [r.record, prepared[i]?.key, r.matches, r.decision ?? null]),
  );
  const unresolved = rows.some((r) => r.matches?.length && !r.decision);
  if (!proof) {
    if (unresolved)
      return {
        rows,
        error:
          'Review every matching row and choose an action, then preview again. Nothing was imported.',
      };
    const stamp = String(Date.now());
    return { rows, proof: stamp + '.' + signature(entity, csv, stamp, review) };
  }
  const [stamp, mac, extra] = proof.split('.');
  if (
    extra ||
    !/^\d+$/.test(stamp ?? '') ||
    !/^[a-f0-9]{64}$/.test(mac ?? '') ||
    Date.now() - Number(stamp) > 15 * 60 * 1000 ||
    Number(stamp) > Date.now()
  )
    throw new Error('Preview expired. Preview the file again.');
  if (
    unresolved ||
    !timingSafeEqual(
      Buffer.from(mac, 'hex'),
      Buffer.from(signature(entity, csv, stamp, review), 'hex'),
    )
  )
    throw new Error('File, decisions or matching records changed. Preview again before importing.');
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
    const createdInBatch = new Set<string>();
    // Recheck within the tenant lock. A new match is returned for review, never silently skipped.
    for (let i = 0; i < prepared.length; i++) {
      const item = prepared[i];
      if (!item) continue;
      const decision = rows[i].decision;
      try {
        if (decision?.action === 'skip') {
          rows[i].status = 'skipped';
          rows[i].message = 'Skipped by your decision';
          continue;
        }
        const current = (await item.matches()).filter((m) => !createdInBatch.has(m.id));
        const reviewed = rows[i].matches?.filter((m) => !m.record) ?? [];
        if (JSON.stringify(current) !== JSON.stringify(reviewed))
          throw new Error('Matching records changed. Preview this row again.');
        if (decision?.action === 'update') {
          await item.update!(decision.targetId!);
          rows[i].status = 'updated';
          rows[i].message = 'Updated selected record; blank CSV fields preserved existing values';
        } else {
          createdInBatch.add(await item.create());
          rows[i].status = 'created';
          rows[i].message =
            decision?.action === 'create' ? 'Created separately by your decision' : 'Created';
        }
      } catch (e) {
        rows[i].status = 'failed';
        rows[i].message = e instanceof Error ? e.message : 'Could not save record';
      }
    }
    await recordAudit({
      action: 'data.imported',
      entityType: 'DataTransfer',
      after: {
        entity,
        created: rows.filter((r) => r.status === 'created').length,
        skipped: rows.filter((r) => r.status === 'skipped').length,
        updated: rows.filter((r) => r.status === 'updated').length,
        decisions: rows.filter((r) => r.decision).map((r) => ({ record: r.record, ...r.decision })),
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
    case 'contacts':
      rows = (await repository(ContactModel).find().limit(10001)).map((d) => ({
        _id: d._id,
        _status: d.status,
        customer: names.get(String(d.organisationId)),
        customerId: String(d.organisationId),
        name: d.name,
        title: d.title,
        email: d.email,
        mobile: d.mobile,
        country: '',
        isPrimary: String(d.isPrimary),
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

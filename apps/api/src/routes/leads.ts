import { z } from 'zod';
import {
  DuplicateLeadError,
  archiveLead,
  convertLead,
  createLead,
  disqualifyLead,
  findLeadDuplicates,
  listLeadSources,
  listLeads,
  startWorkingLead,
  updateLead,
} from '@/modules/crm/services/lead.service';
import { LEAD_STATUSES } from '@coex/shared/crm/models/lead.model';
import { HttpError } from '../http/errors';
import { defineRoute } from '../http/route';

/**
 * Leads: the first module to move to the API (revamp Phase 2). Every route calls the existing lead
 * service, which enforces permissions and visibility itself, so the API adds no second copy of a
 * rule. The service file moves into this app when the Leads screens switch over.
 */

const leadSchema = z.object({
  id: z.string(),
  number: z.string(),
  name: z.string(),
  company: z.string().nullable(),
  email: z.string().nullable(),
  mobile: z.string().nullable(),
  source: z.string().nullable(),
  ownerId: z.string(),
  ownerName: z.string(),
  status: z.enum(LEAD_STATUSES),
  disqualifiedReason: z.string().nullable(),
  notes: z.string().nullable(),
  customFields: z.record(z.string(), z.unknown()),
  convertedOrganisationId: z.string().nullable(),
  createdAt: z.string(),
});

const objectId = z.string().regex(/^[a-f0-9]{24}$/);
const idParams = z.object({ id: objectId });
const done = z.object({ ok: z.literal(true) });

const leadInputSchema = z.object({
  name: z.string(),
  company: z.string().optional(),
  email: z.string().optional(),
  mobile: z.string().optional(),
  mobileCountry: z.string().optional(),
  source: z.string().optional(),
  ownerId: objectId.optional(),
  notes: z.string().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

const duplicateProbeSchema = z.object({
  email: z.string().optional(),
  mobile: z.string().optional(),
  mobileCountry: z.string().optional(),
  company: z.string().optional(),
});

/** A lead that looks like someone known is a 409 carrying who, so the screen can offer "save anyway". */
async function refusingDuplicates<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof DuplicateLeadError) {
      throw new HttpError(409, 'duplicate', error.message, error.duplicates);
    }
    throw error;
  }
}

export const leadRoutes = [
  defineRoute({
    method: 'get',
    path: '/leads',
    tag: 'Leads',
    summary: 'List leads. A salesperson sees their own; lead.read.all sees every lead.',
    permission: 'lead.read',
    query: z.object({
      status: z.enum(LEAD_STATUSES).optional(),
      source: z.string().min(1).optional(),
      ownerId: z
        .string()
        .regex(/^[a-f0-9]{24}$/)
        .optional(),
      q: z.string().min(1).optional(),
    }),
    response: z.object({ leads: z.array(leadSchema), sources: z.array(z.string()) }),
    handler: async ({ query }) => {
      const [leads, sources] = await Promise.all([
        listLeads({
          status: query.status,
          source: query.source,
          ownerId: query.ownerId,
          search: query.q,
        }),
        listLeadSources(),
      ]);

      return {
        leads: leads.map((lead) => ({ ...lead, createdAt: lead.createdAt.toISOString() })),
        sources,
      };
    },
  }),

  defineRoute({
    method: 'post',
    path: '/leads',
    tag: 'Leads',
    summary:
      'Create a lead. Answers 409 with the people it looks like unless confirmDuplicates is true.',
    permission: 'lead.manage',
    body: leadInputSchema.extend({ confirmDuplicates: z.boolean().optional() }),
    status: 201,
    response: z.object({ id: z.string() }),
    handler: async ({ body }) => {
      const { confirmDuplicates, ...input } = body;
      const id = await refusingDuplicates(() => createLead(input, { confirmDuplicates }));
      return { id };
    },
  }),

  defineRoute({
    method: 'post',
    path: '/leads/duplicates',
    tag: 'Leads',
    summary: 'Who a lead with these details would look like, before saving it.',
    permission: 'lead.read',
    body: duplicateProbeSchema.extend({ excludeId: objectId.optional() }),
    response: z.object({
      duplicates: z.array(
        z.object({
          kind: z.enum(['lead', 'customer', 'contact']),
          id: z.string(),
          label: z.string(),
          reasons: z.array(z.string()),
        }),
      ),
    }),
    handler: async ({ body }) => {
      const { excludeId, ...probe } = body;
      return { duplicates: await findLeadDuplicates(probe, excludeId) };
    },
  }),

  defineRoute({
    method: 'put',
    path: '/leads/:id',
    tag: 'Leads',
    summary: 'Replace a lead’s details. A converted lead can no longer be edited.',
    permission: 'lead.manage',
    params: idParams,
    body: leadInputSchema,
    response: done,
    handler: async ({ params, body }) => {
      await updateLead(params.id, body);
      return { ok: true as const };
    },
  }),

  defineRoute({
    method: 'post',
    path: '/leads/:id/start-working',
    tag: 'Leads',
    summary: 'Mark a new lead as being worked, or put a disqualified one back to work.',
    permission: 'lead.manage',
    params: idParams,
    response: done,
    handler: async ({ params }) => {
      await startWorkingLead(params.id);
      return { ok: true as const };
    },
  }),

  defineRoute({
    method: 'post',
    path: '/leads/:id/disqualify',
    tag: 'Leads',
    summary: 'Disqualify a lead that is still being worked. A reason is required.',
    permission: 'lead.manage',
    params: idParams,
    body: z.object({ reason: z.string() }),
    response: done,
    handler: async ({ params, body }) => {
      await disqualifyLead(params.id, body.reason);
      return { ok: true as const };
    },
  }),

  defineRoute({
    method: 'post',
    path: '/leads/:id/archive',
    tag: 'Leads',
    summary: 'Archive a lead. Nothing deletes; it leaves the list and stays in the audit history.',
    permission: 'lead.manage',
    params: idParams,
    response: done,
    handler: async ({ params }) => {
      await archiveLead(params.id);
      return { ok: true as const };
    },
  }),

  defineRoute({
    method: 'post',
    path: '/leads/:id/convert',
    tag: 'Leads',
    summary: 'Turn a lead into a customer, a contact and optionally an opportunity.',
    permission: 'lead.manage',
    params: idParams,
    body: z.object({
      organisationId: objectId.optional(),
      newCustomerName: z.string().optional(),
      opportunity: z
        .object({
          title: z.string(),
          oneOff: z.string().optional(),
          recurring: z.string().optional(),
          currency: z.string().optional(),
        })
        .optional(),
    }),
    response: z.object({
      organisationId: z.string(),
      contactId: z.string(),
      opportunityId: z.string().nullable(),
    }),
    handler: async ({ params, body }) => convertLead(params.id, body),
  }),
];

import { z } from 'zod';
import { listLeadSources, listLeads } from '@/modules/crm/services/lead.service';
import { LEAD_STATUSES } from '@coex/shared/crm/models/lead.model';
import { defineRoute } from '../http/route';

/**
 * Leads, read only: the first module slice, built to prove the pattern end to end (session cookie,
 * tenant context, permission, the existing service, a declared response shape). The lead service
 * is imported unchanged from the web app's source; it moves into this app when the Leads screens
 * switch over, so there is never a second copy of a rule.
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
  convertedOrganisationId: z.string().nullable(),
  createdAt: z.string(),
});

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
];

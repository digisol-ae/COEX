import Link from 'next/link';
import { clsx } from 'clsx';
import { asUser, requirePermission } from '@/lib/session';
import {
  listLeadSources,
  listLeads,
  type LeadFilter,
  type LeadSummary,
} from '@/modules/crm/services/lead.service';
import { listFieldDefinitions } from '@/modules/crm/services/field-definition.service';
import { listUsers } from '@/modules/core/services/user.service';
import { listOrganisations } from '@/modules/crm/services/organisation.service';
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';
import { LEAD_STATUSES } from '@/modules/crm/models/lead.model';
import { archiveLeadAction, startWorkingLeadAction } from './actions';
import { ConvertButton } from './convert-button';
import { DisqualifyButton } from './disqualify-button';
import { LeadPanel } from './lead-panel';

export const metadata = { title: 'Leads · COEX' };

const STATUS_LABEL: Record<LeadSummary['status'], string> = {
  new: 'New',
  working: 'Working',
  converted: 'Converted',
  disqualified: 'Disqualified',
};

const STATUS_TONE = {
  new: 'warn',
  working: 'ok',
  converted: 'neutral',
  disqualified: 'alert',
} as const;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string; owner?: string; q?: string }>;
}) {
  const params = await searchParams;
  const actor = await requirePermission('lead.read');
  const editable = actor.permissions.includes('lead.manage');
  const seesEveryone = actor.permissions.includes('lead.read.all');

  const status = (LEAD_STATUSES as readonly string[]).includes(params.status ?? '')
    ? (params.status as LeadFilter['status'])
    : undefined;
  const filter: LeadFilter = {
    status,
    source: params.source || undefined,
    ownerId: seesEveryone ? params.owner || undefined : undefined,
    search: params.q || undefined,
  };

  const canConvert = actor.permissions.includes('customer.manage');
  const [leads, everyLead, sources, fields, users, organisations] = await asUser(actor, () =>
    Promise.all([
      listLeads(filter),
      listLeads(),
      listLeadSources(),
      listFieldDefinitions('lead'),
      listUsers(),
      canConvert ? listOrganisations() : Promise.resolve([]),
    ]),
  );

  const owners = users
    .filter((user) => user.status === 'active')
    .map(({ id, name }) => ({ id, name }));
  const countFor = (option: LeadFilter['status']) =>
    everyLead.filter((lead) => !option || lead.status === option).length;
  const link = (next: Partial<Record<'status' | 'source' | 'owner' | 'q', string | undefined>>) => {
    const merged = { ...params, ...next };
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) if (value) query.set(key, value);
    return query.size ? `/leads?${query}` : '/leads';
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Leads"
        description={
          seesEveryone
            ? 'Possible customers who are not qualified yet. You see every lead.'
            : 'Possible customers who are not qualified yet. You see the leads you own.'
        }
        action={
          editable ? (
            <LeadPanel sources={sources} owners={owners} currentUserId={actor.id} fields={fields} />
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Lead filters">
        {([undefined, ...LEAD_STATUSES] as (LeadSummary['status'] | undefined)[]).map((option) => {
          const selected = status === option;

          return (
            <Link
              key={option ?? 'all'}
              href={link({ status: option })}
              aria-current={selected ? 'true' : undefined}
              className={clsx(
                'inline-flex items-center gap-2 rounded-[var(--radius-control)] border px-3 py-2 text-sm font-medium transition-colors',
                'bg-[var(--color-surface-sunken)] text-[var(--color-ink-muted)]',
                selected ? 'border-current' : 'border-transparent hover:border-current',
              )}
            >
              {option ? STATUS_LABEL[option] : 'All'}
              <span className="font-semibold tabular-nums">({countFor(option)})</span>
            </Link>
          );
        })}

        <form action="/leads" className="ml-auto flex flex-wrap gap-2">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <select
            name="source"
            defaultValue={params.source ?? ''}
            aria-label="Source"
            className="rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-2 py-2 text-sm"
          >
            <option value="">Any source</option>
            {sources.map((source) => (
              <option key={source}>{source}</option>
            ))}
          </select>
          {seesEveryone ? (
            <select
              name="owner"
              defaultValue={params.owner ?? ''}
              aria-label="Owner"
              className="rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-2 py-2 text-sm"
            >
              <option value="">Any owner</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          ) : null}
          <input
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Search leads"
            aria-label="Search leads"
            className="rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          />
          <IconButton type="submit" icon="preview" label="Apply filters" />
        </form>
      </div>

      <Card>
        {leads.length === 0 ? (
          <EmptyState
            message={
              everyLead.length === 0
                ? 'No leads yet. Add the first one.'
                : 'No leads match these filters.'
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Lead</Th>
                <Th>Contact</Th>
                <Th>Source</Th>
                <Th>Owner</Th>
                <Th>Status</Th>
                <Th>{''}</Th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  data-sort-values={JSON.stringify([
                    lead.number,
                    lead.email ?? lead.mobile ?? '',
                    lead.source ?? '',
                    lead.ownerName,
                    lead.status,
                  ])}
                >
                  <Td>
                    <div className="font-medium text-[var(--color-ink)]">{lead.name}</div>
                    <div className="text-xs text-[var(--color-ink-subtle)]">
                      <span className="font-mono">{lead.number}</span>
                      {lead.company ? ` · ${lead.company}` : ''}
                    </div>
                  </Td>
                  <Td className="text-[var(--color-ink-muted)]">
                    {lead.email ?? ''}
                    {lead.email && lead.mobile ? <br /> : null}
                    {lead.mobile ?? ''}
                  </Td>
                  <Td className="text-[var(--color-ink-muted)]">{lead.source ?? ''}</Td>
                  <Td className="text-[var(--color-ink-muted)]">{lead.ownerName}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[lead.status]}>{STATUS_LABEL[lead.status]}</Badge>
                    {lead.convertedOrganisationId ? (
                      <div className="mt-1 text-xs">
                        <Link
                          className="underline"
                          href={`/customers/${lead.convertedOrganisationId}`}
                        >
                          Open customer
                        </Link>
                      </div>
                    ) : null}
                    {lead.disqualifiedReason ? (
                      <div className="mt-1 text-xs text-[var(--color-ink-subtle)]">
                        {lead.disqualifiedReason}
                      </div>
                    ) : null}
                  </Td>
                  <Td>
                    {editable && lead.status !== 'converted' ? (
                      <div className="flex items-center justify-end gap-1">
                        <LeadPanel
                          sources={sources}
                          owners={owners}
                          currentUserId={actor.id}
                          fields={fields}
                          lead={{
                            id: lead.id,
                            name: lead.name,
                            company: lead.company ?? '',
                            email: lead.email ?? '',
                            mobile: lead.mobile ?? '',
                            source: lead.source ?? '',
                            ownerId: lead.ownerId,
                            notes: lead.notes ?? '',
                            customFields: lead.customFields as Record<
                              string,
                              string | number | boolean | null
                            >,
                          }}
                        />
                        {lead.status === 'new' || lead.status === 'disqualified' ? (
                          <form action={startWorkingLeadAction}>
                            <input type="hidden" name="id" value={lead.id} />
                            <IconButton
                              type="submit"
                              icon="status"
                              label={
                                lead.status === 'new' ? 'Start working this lead' : 'Reopen lead'
                              }
                            />
                          </form>
                        ) : null}
                        {(lead.status === 'new' || lead.status === 'working') && canConvert ? (
                          <ConvertButton
                            leadId={lead.id}
                            leadName={lead.name}
                            defaultCustomerName={lead.company ?? lead.name}
                            customers={organisations.map(({ id, name }) => ({ id, name }))}
                            canCreateOpportunity={actor.permissions.includes('opportunity.manage')}
                          />
                        ) : null}
                        {lead.status === 'new' || lead.status === 'working' ? (
                          <DisqualifyButton leadId={lead.id} leadName={lead.name} />
                        ) : null}
                        <form action={archiveLeadAction}>
                          <input type="hidden" name="id" value={lead.id} />
                          <IconButton type="submit" icon="archive" label="Archive lead" />
                        </form>
                      </div>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

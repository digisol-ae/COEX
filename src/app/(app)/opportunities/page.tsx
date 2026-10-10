import Link from 'next/link';
import { clsx } from 'clsx';
import { asUser, requirePermission } from '@/lib/session';
import {
  listOpportunities,
  type OpportunityFilter,
  type OpportunitySummary,
} from '@/modules/crm/services/opportunity.service';
import { listLostReasons, listStages } from '@/modules/crm/services/pipeline.service';
import { listOrganisations } from '@/modules/crm/services/organisation.service';
import { fromMinorUnits, listProducts } from '@/modules/crm/services/product.service';
import { listUsers } from '@/modules/core/services/user.service';
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';
import { OPPORTUNITY_STATUSES } from '@/modules/crm/models/opportunity.model';
import { lacksNextStep, nextStepOverdue, totalsByCurrency } from '@/modules/crm/opportunity-rules';
import { todayKey } from '@/modules/crm/contract-status';
import { archiveOpportunityAction } from './actions';
import { MoveButton } from './move-button';
import { OpportunityPanel } from './opportunity-panel';

export const metadata = { title: 'Opportunities · COEX' };

const STATUS_LABEL: Record<OpportunitySummary['status'], string> = {
  open: 'Open',
  won: 'Won',
  lost: 'Lost',
};

const STATUS_TONE = { open: 'warn', won: 'ok', lost: 'alert' } as const;

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; stage?: string; owner?: string; q?: string }>;
}) {
  const params = await searchParams;
  const actor = await requirePermission('opportunity.read');
  const editable = actor.permissions.includes('opportunity.manage');
  const canReopen = actor.permissions.includes('pipeline.manage');
  const seesEveryone = actor.permissions.includes('opportunity.read.all');

  const status = (OPPORTUNITY_STATUSES as readonly string[]).includes(params.status ?? '')
    ? (params.status as OpportunityFilter['status'])
    : undefined;
  const filter: OpportunityFilter = {
    status,
    stageId: params.stage || undefined,
    ownerId: seesEveryone ? params.owner || undefined : undefined,
    search: params.q || undefined,
  };

  const [items, everyItem, stages, lostReasons, organisations, products, users] = await asUser(
    actor,
    () =>
      Promise.all([
        listOpportunities(filter),
        listOpportunities(),
        listStages(),
        listLostReasons(),
        listOrganisations(),
        listProducts(),
        listUsers(),
      ]),
  );

  const owners = users
    .filter((user) => user.status === 'active')
    .map(({ id, name }) => ({ id, name }));
  const customers = organisations.map(({ id, name }) => ({ id, name }));
  const productChoices = products.map(({ id, name, code }) => ({ id, name, code }));
  const openStages = stages
    .filter((stage) => stage.kind === 'open')
    .map(({ id, name, probability }) => ({ id, name, probability }));
  const today = todayKey();
  const totals = totalsByCurrency(items.filter((item) => item.status === 'open'));

  const countFor = (option: OpportunityFilter['status']) =>
    everyItem.filter((item) => !option || item.status === option).length;
  const link = (next: Partial<Record<'status' | 'stage' | 'owner' | 'q', string | undefined>>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...params, ...next }))
      if (value) query.set(key, value);
    return query.size ? `/opportunities?${query}` : '/opportunities';
  };
  const controlClass =
    'rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-2 py-2 text-sm';

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Opportunities"
        description={
          seesEveryone
            ? 'Potential sales to customers, from first interest to won or lost. You see every opportunity.'
            : 'Potential sales to customers, from first interest to won or lost. You see the opportunities you own.'
        }
        action={
          editable ? (
            <OpportunityPanel
              organisations={customers}
              products={productChoices}
              owners={owners}
              openStages={openStages}
              currentUserId={actor.id}
            />
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Opportunity filters">
        {([undefined, ...OPPORTUNITY_STATUSES] as (OpportunitySummary['status'] | undefined)[]).map(
          (option) => (
            <Link
              key={option ?? 'all'}
              href={link({ status: option })}
              aria-current={status === option ? 'true' : undefined}
              className={clsx(
                'inline-flex items-center gap-2 rounded-[var(--radius-control)] border px-3 py-2 text-sm font-medium transition-colors',
                'bg-[var(--color-surface-sunken)] text-[var(--color-ink-muted)]',
                status === option ? 'border-current' : 'border-transparent hover:border-current',
              )}
            >
              {option ? STATUS_LABEL[option] : 'All'}
              <span className="font-semibold tabular-nums">({countFor(option)})</span>
            </Link>
          ),
        )}

        <form action="/opportunities" className="ml-auto flex flex-wrap gap-2">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <select
            name="stage"
            defaultValue={params.stage ?? ''}
            aria-label="Stage"
            className={controlClass}
          >
            <option value="">Any stage</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
          {seesEveryone ? (
            <select
              name="owner"
              defaultValue={params.owner ?? ''}
              aria-label="Owner"
              className={controlClass}
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
            placeholder="Search opportunities"
            aria-label="Search opportunities"
            className={clsx(controlClass, 'px-3')}
          />
          <IconButton type="submit" icon="preview" label="Apply filters" />
        </form>
      </div>

      {totals.length > 0 ? (
        <p className="mb-3 text-sm text-[var(--color-ink-muted)]">
          Open in this list:{' '}
          {totals
            .map(
              (line) =>
                `${line.count} in ${line.currency}, one-off ${fromMinorUnits(line.oneOffMinorUnits)}, recurring per year ${fromMinorUnits(line.recurringMinorUnits)}`,
            )
            .join(' · ')}
        </p>
      ) : null}

      <Card>
        {items.length === 0 ? (
          <EmptyState
            message={
              everyItem.length === 0
                ? 'No opportunities yet. Add the first one.'
                : 'No opportunities match these filters.'
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Opportunity</Th>
                <Th>Customer</Th>
                <Th>Stage</Th>
                <Th>Value</Th>
                <Th>Next step</Th>
                <Th>Owner</Th>
                <Th>{''}</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  data-sort-values={JSON.stringify([
                    item.number,
                    item.organisationName,
                    item.stageName,
                    item.oneOffMinorUnits + item.recurringMinorUnits,
                    item.nextStepDate ?? '',
                    item.ownerName,
                  ])}
                >
                  <Td>
                    <Link
                      href={`/opportunities/${item.id}`}
                      className="font-medium text-[var(--color-ink)] hover:underline"
                    >
                      {item.title}
                    </Link>
                    <div className="font-mono text-xs text-[var(--color-ink-subtle)]">
                      {item.number}
                    </div>
                  </Td>
                  <Td>{item.organisationName}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[item.status]}>{item.stageName}</Badge>
                    <div className="mt-1 text-xs text-[var(--color-ink-subtle)]">
                      {item.status === 'lost' && item.lostReason
                        ? item.lostReason
                        : `${item.probability}%`}
                    </div>
                  </Td>
                  <Td className="text-[var(--color-ink-muted)]">
                    {item.currency} {fromMinorUnits(item.oneOffMinorUnits)} one-off
                    <br />
                    {fromMinorUnits(item.recurringMinorUnits)} per year
                  </Td>
                  <Td className="text-[var(--color-ink-muted)]">
                    {lacksNextStep(item) ? (
                      <span className="text-[var(--color-status-warn)]">No next step</span>
                    ) : (
                      item.nextStep
                    )}
                    {item.nextStepDate ? (
                      <div
                        className={clsx(
                          'text-xs',
                          nextStepOverdue(item, today)
                            ? 'text-[var(--color-status-alert)]'
                            : 'text-[var(--color-ink-subtle)]',
                        )}
                      >
                        {item.nextStepDate}
                        {nextStepOverdue(item, today) ? ' (overdue)' : ''}
                      </div>
                    ) : null}
                  </Td>
                  <Td className="text-[var(--color-ink-muted)]">{item.ownerName}</Td>
                  <Td>
                    {editable ? (
                      <div className="flex items-center justify-end gap-1">
                        {item.status === 'open' ? (
                          <OpportunityPanel
                            organisations={customers}
                            products={productChoices}
                            owners={owners}
                            openStages={openStages}
                            currentUserId={actor.id}
                            opportunity={{
                              id: item.id,
                              organisationId: item.organisationId,
                              contactId: item.contactId ?? '',
                              title: item.title,
                              ownerId: item.ownerId,
                              oneOff: fromMinorUnits(item.oneOffMinorUnits),
                              recurring: fromMinorUnits(item.recurringMinorUnits),
                              currency: item.currency,
                              expectedCloseDate: item.expectedCloseDate ?? '',
                              probability: String(item.probability),
                              productIds: item.productIds,
                              nextStep: item.nextStep ?? '',
                              nextStepDate: item.nextStepDate ?? '',
                              quoteReference: item.quoteReference ?? '',
                              notes: item.notes ?? '',
                            }}
                          />
                        ) : null}
                        <MoveButton
                          opportunityId={item.id}
                          title={item.title}
                          currentStageId={item.stageId}
                          closed={item.status !== 'open'}
                          canReopen={canReopen}
                          stages={stages.map(({ id, name, kind }) => ({ id, name, kind }))}
                          lostReasons={lostReasons}
                        />
                        <form action={archiveOpportunityAction}>
                          <input type="hidden" name="id" value={item.id} />
                          <IconButton type="submit" icon="archive" label="Archive opportunity" />
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

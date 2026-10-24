import { DetailPopup } from '@/components/ui/detail-popup';
import { notFound } from 'next/navigation';
import { asUser, requirePermission } from '@/lib/session';
import { getOpportunity } from '@/modules/crm/services/opportunity.service';
import { listLostReasons, listStages } from '@/modules/crm/services/pipeline.service';
import { fromMinorUnits, listProducts } from '@/modules/crm/services/product.service';
import { historyFor } from '@/modules/core/services/audit.service';
import { todayKey } from '@coex/shared/crm/contract-status';
import { lacksNextStep, nextStepOverdue } from '@coex/shared/crm/opportunity-rules';
import { FactBadge, FactRow } from '@/components/ui/fact-badge';
import { Badge, Card, CardSection, Notice, PageHeader } from '@/components/ui';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ContractPanel } from '@/app/(app)/contracts/contract-panel';
import { listOrganisations } from '@/modules/crm/services/organisation.service';
import { suggestedEndDate } from '@/modules/crm/services/contract.service';
import { MoveButton } from '../move-button';

export const metadata = { title: 'Opportunity · Worktello' };

const STATUS_TONE = { open: 'warn', won: 'ok', lost: 'alert' } as const;

export default async function OpportunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ contract?: string }>;
}) {
  const { id } = await params;
  const openContract = (await searchParams).contract === '1';
  const actor = await requirePermission('opportunity.read');
  const editable = actor.permissions.includes('opportunity.manage');
  const canCreateContract = actor.permissions.includes('contract.manage');

  const [opportunity, stages, lostReasons, productList, history] = await asUser(actor, () =>
    Promise.all([
      getOpportunity(id),
      listStages(),
      listLostReasons(),
      listProducts(true),
      historyFor('Opportunity', id, 50),
    ]),
  );
  if (!opportunity) notFound();

  const customers =
    opportunity.status === 'won' && canCreateContract
      ? (await asUser(actor, () => listOrganisations())).map(({ id: customerId, name }) => ({
          id: customerId,
          name,
        }))
      : [];
  const startToday = todayKey();

  const productNames = productList
    .filter((product) => opportunity.productIds.includes(product.id))
    .map((product) => product.name);

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumb
        trail={[{ label: 'Opportunities', href: '/opportunities' }, { label: opportunity.number }]}
      />

      <div className="mt-2">
        <PageHeader
          descriptionInline
          title={opportunity.title}
          description={`${opportunity.organisationName} · ${opportunity.serviceModel === 'subscription' ? 'Subscription' : 'Contractual'} · owner ${opportunity.ownerName}`}
          action={
            <div className="flex items-center gap-2">
              <Badge tone={STATUS_TONE[opportunity.status]}>{opportunity.stageName}</Badge>
              {editable ? (
                <MoveButton
                  opportunityId={opportunity.id}
                  title={opportunity.title}
                  currentStageId={opportunity.stageId}
                  closed={opportunity.status !== 'open'}
                  canReopen={actor.permissions.includes('pipeline.manage')}
                  canCreateContract={canCreateContract}
                  stages={stages.map(({ id: stageId, name, kind }) => ({
                    id: stageId,
                    name,
                    kind,
                  }))}
                  lostReasons={lostReasons}
                />
              ) : null}
            </div>
          }
        />
      </div>

      <div className="space-y-3">
        {lacksNextStep(opportunity) ? (
          <Notice tone="warn">This opportunity has no next step. Add one from the list.</Notice>
        ) : null}
        {nextStepOverdue(opportunity, todayKey()) ? (
          <Notice tone="alert">The next step was due on {opportunity.nextStepDate}.</Notice>
        ) : null}

        <Card className="!bg-transparent !shadow-none">
          <CardSection>
            <FactRow>
              <FactBadge
                icon="building"
                label="Customer"
                href={`/customers/${opportunity.organisationId}`}
              >
                {opportunity.organisationName}
                {opportunity.contactName ? ` · ${opportunity.contactName}` : ''}
              </FactBadge>
              <FactBadge icon="percent" label="Chance of winning">
                {opportunity.probability}%
              </FactBadge>
              <FactBadge icon="money" label="One-off value">
                {opportunity.currency} {fromMinorUnits(opportunity.oneOffMinorUnits)} one-off
              </FactBadge>
              <FactBadge icon="money" label="Recurring value per year">
                {opportunity.currency} {fromMinorUnits(opportunity.recurringMinorUnits)} / year
              </FactBadge>
              <FactBadge icon="calendar" label="Expected close">
                {opportunity.expectedCloseDate ?? 'No close date'}
              </FactBadge>
              <FactBadge icon="receipt" label="Zoho Books quote">
                {opportunity.quoteReference ?? 'No quote'}
              </FactBadge>
              <FactBadge
                icon="step"
                label="Next step"
                tone={nextStepOverdue(opportunity, todayKey()) ? 'alert' : undefined}
              >
                {opportunity.nextStep ?? 'No next step'}
                {opportunity.nextStepDate ? ` (${opportunity.nextStepDate})` : ''}
              </FactBadge>
              <FactBadge
                icon="box"
                label={productNames.length ? `Products: ${productNames.join(', ')}` : 'Products'}
              >
                {productNames.length ? productNames.join(', ') : 'No products'}
              </FactBadge>
              {opportunity.lostReason ? (
                <FactBadge icon="alert" label="Lost because" tone="warn">
                  {opportunity.lostReason}
                </FactBadge>
              ) : null}
            </FactRow>
            {opportunity.notes ? (
              <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{opportunity.notes}</p>
            ) : null}
          </CardSection>
        </Card>

        {opportunity.status === 'won' && canCreateContract ? (
          <Card>
            <CardSection title="Next: a contract for this sale">
              <p className="mb-3 text-sm text-[var(--color-ink-muted)]">
                Optional. This opens the contract form already filled in with the customer, the
                products and the value. The contract stays a separate record that a manager
                activates; invoicing stays in Zoho Books.
              </p>
              <ContractPanel
                organisations={customers}
                products={productList
                  .filter((product) => product.status === 'active')
                  .map(({ id: productId, name, code }) => ({ id: productId, name, code }))}
                defaultOpen={openContract}
                prefill={{
                  organisationId: opportunity.organisationId,
                  title: opportunity.title,
                  type:
                    opportunity.serviceModel === 'subscription'
                      ? 'subscription'
                      : opportunity.recurringMinorUnits > 0
                        ? 'amc'
                        : 'project',
                  startDate: startToday,
                  endDate: suggestedEndDate(startToday),
                  billingFrequency: 'yearly',
                  value: fromMinorUnits(
                    opportunity.recurringMinorUnits > 0
                      ? opportunity.recurringMinorUnits
                      : opportunity.oneOffMinorUnits,
                  ),
                  currency: opportunity.currency,
                  productIds: opportunity.productIds,
                  zohoReference: opportunity.quoteReference ?? '',
                  notes: `From opportunity ${opportunity.number}`,
                }}
              />
            </CardSection>
          </Card>
        ) : null}

        <div className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
          <span>{history.length} history entries</span>
          <DetailPopup title="Opportunity history">
            <div className="border-t border-[var(--color-line)] px-4 py-3">
              {history.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-muted)]">Nothing recorded yet.</p>
              ) : (
                <ol className="space-y-2 text-sm">
                  {[...history].reverse().map((row) => (
                    <li key={row.id}>
                      <span className="font-medium">
                        {row.action.replace('opportunity.', '').replace('_', ' ')}
                      </span>{' '}
                      <span className="text-[var(--color-ink-subtle)]">
                        by {row.actorName} on {row.at.toISOString().slice(0, 10)}
                      </span>
                      {row.changes.length ? (
                        <ul className="ml-4 list-disc text-[var(--color-ink-muted)]">
                          {row.changes.map((change) => (
                            <li key={change.field}>
                              {change.field}:{' '}
                              {change.from === undefined ? '' : `${String(change.from)} → `}
                              {String(change.to)}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </DetailPopup>
        </div>
      </div>
    </div>
  );
}

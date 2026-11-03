import { parallel } from '@/lib/parallel';
import { listContracts } from '@/modules/crm/services/contract.service';
import { CustomerDrawer } from './customer-drawer';
import { LiveRefresh } from '@/components/ui/live-refresh';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asUser, requirePermission } from '@/lib/session';
import { getOrganisation } from '@/modules/crm/services/organisation.service';
import { listContacts } from '@/modules/crm/services/contact.service';
import { listLocations } from '@/modules/crm/services/location.service';
import { listTimeline } from '@/modules/crm/services/activity.service';
import { listFieldDefinitions } from '@/modules/crm/services/field-definition.service';
import { listOpportunities } from '@/modules/crm/services/opportunity.service';
import { fromMinorUnits } from '@/modules/crm/services/product.service';
import { CustomerSummary } from './customer-summary';
import { Badge, Card, CardSection, PageHeader } from '@/components/ui';
import { DetailsForm } from './details-form';
import { ContactsPanel } from './contacts-panel';
import { LocationsPanel } from './locations-panel';
import { Timeline } from './timeline';

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission('customer.read');
  const { id } = await params;

  const organisation = await asUser(actor, () => getOrganisation(id));
  if (!organisation) notFound();

  const seesOpportunities = actor.permissions.includes('opportunity.read');

  const { contacts, locations, timeline, customFieldDefinitions, opportunities, services } =
    await asUser(actor, () =>
      parallel({
        services: actor.permissions.includes('contract.read')
          ? listContracts({ organisationId: id })
          : [],
        opportunities: seesOpportunities ? listOpportunities({ organisationId: id }) : [],
        contacts: listContacts(id),
        locations: listLocations(id),
        timeline: listTimeline(id, 0),
        customFieldDefinitions: listFieldDefinitions('organisation'),
      }),
    );

  // A Mongoose Map has to become a plain object before it crosses into a client component.
  const customFieldValues = Object.fromEntries(organisation.customFields ?? []) as Record<
    string,
    string | number | boolean | null
  >;

  const editable = actor.permissions.includes('customer.manage');

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/customers"
        className="text-sm text-[var(--color-ink-muted)] underline-offset-4 hover:underline"
      >
        Back to customers
      </Link>

      <div className="mt-3">
        <PageHeader
          descriptionInline
          title={organisation.name}
          titleExtra={
            <Badge tone={organisation.kind === 'client' ? 'ok' : 'info'}>{organisation.kind}</Badge>
          }
          description={organisation.industry ?? undefined}
          action={
            <div className="ml-auto flex items-center justify-end gap-3">
              <LiveRefresh />
              <CustomerDrawer
                name={organisation.name}
                contacts={contacts.length}
                sites={locations.length}
                opportunities={seesOpportunities ? opportunities.length : undefined}
              >
                {seesOpportunities ? (
                  <Card>
                    <CardSection title="Opportunities">
                      {opportunities.length === 0 ? (
                        <p className="text-sm text-[var(--color-ink-muted)]">
                          No opportunities for this customer yet.
                        </p>
                      ) : (
                        <ul className="space-y-2 text-sm">
                          {opportunities.map((deal) => (
                            <li key={deal.id}>
                              <Link
                                href={`/opportunities/${deal.id}`}
                                className="font-medium hover:underline"
                              >
                                {deal.title}
                              </Link>
                              <div className="text-xs text-[var(--color-ink-subtle)]">
                                {deal.number} · {deal.stageName} · {deal.currency}{' '}
                                {fromMinorUnits(deal.oneOffMinorUnits)} one-off,{' '}
                                {fromMinorUnits(deal.recurringMinorUnits)} per year
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardSection>
                  </Card>
                ) : null}

                <ContactsPanel
                  organisationId={id}
                  contacts={contacts}
                  canWrite={editable}
                  canManagePortal={actor.permissions.includes('user.manage')}
                  canSearchTickets={actor.permissions.includes('ticket.read.all')}
                />
                <LocationsPanel organisationId={id} locations={locations} canWrite={editable} />
              </CustomerDrawer>
            </div>
          }
        />
      </div>

      <Card className="!bg-transparent !shadow-none">
        <CardSection>
          <CustomerSummary
            editable={editable}
            organisation={{
              industry: organisation.industry ?? '',
              email: organisation.email ?? '',
              phone: organisation.phone ?? '',
              website: organisation.website ?? '',
              address: organisation.address ?? '',
              expiryWarningDays: organisation.expiryWarningDays ?? 30,
            }}
          >
            <DetailsForm
              editable={editable}
              customFields={customFieldDefinitions}
              customFieldValues={customFieldValues}
              organisation={{
                id,
                name: organisation.name,
                kind: organisation.kind,
                industry: organisation.industry ?? '',
                email: organisation.email ?? '',
                phone: organisation.phone ?? '',
                website: organisation.website ?? '',
                address: organisation.address ?? '',
                notes: organisation.notes ?? '',
                expiryWarningDays: organisation.expiryWarningDays ?? 30,
              }}
            />
          </CustomerSummary>
        </CardSection>
      </Card>
      {actor.permissions.includes('contract.read') ? (
        <Card className="my-3">
          <CardSection title="Services">
            <div className="mb-2 flex justify-between gap-2 text-sm">
              <span className="text-[var(--color-ink-muted)]">
                Contractual support and subscriptions
              </span>
              {actor.permissions.includes('contract.manage') ? (
                <Link className="font-medium hover:underline" href={`/contracts?customer=${id}`}>
                  Add service
                </Link>
              ) : null}
            </div>
            {services.length ? (
              <ul className="space-y-3">
                {services.map((service) => (
                  <li
                    key={service.id}
                    className="flex flex-wrap items-start justify-between gap-2 border-t border-[var(--color-line)] pt-2 text-sm"
                  >
                    <div>
                      <Link
                        href={`/contracts/${service.id}`}
                        className="font-medium hover:underline"
                      >
                        {service.title}
                      </Link>
                      <div className="text-xs text-[var(--color-ink-muted)]">
                        {service.type === 'subscription' ? 'Subscription' : 'Contractual'} ·{' '}
                        {service.status} · {service.startDate} to {service.endDate}
                      </div>
                    </div>
                    <div className="text-right">
                      {service.currency} {fromMinorUnits(service.valueMinorUnits)} /{' '}
                      {service.billingFrequency}
                      <div className="text-xs text-[var(--color-ink-muted)]">
                        Upfront: {service.currency}{' '}
                        {fromMinorUnits(
                          (service.setupFeeMinorUnits ?? 0) + (service.trainingFeeMinorUnits ?? 0),
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--color-ink-muted)]">No services linked yet.</p>
            )}
          </CardSection>
        </Card>
      ) : null}
      <Timeline organisationId={id} entries={timeline} canWrite={editable} />
    </div>
  );
}

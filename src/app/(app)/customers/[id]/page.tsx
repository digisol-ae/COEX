import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asUser, requirePermission } from '@/lib/session';
import { getOrganisation } from '@/modules/crm/services/organisation.service';
import { listContacts } from '@/modules/crm/services/contact.service';
import { listLocations } from '@/modules/crm/services/location.service';
import { listTimeline } from '@/modules/crm/services/activity.service';
import { listFieldDefinitions } from '@/modules/crm/services/field-definition.service';
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

  const { contacts, locations, timeline, customFieldDefinitions } = await asUser(
    actor,
    async () => ({
      contacts: await listContacts(id),
      locations: await listLocations(id),
      timeline: await listTimeline(id),
      customFieldDefinitions: await listFieldDefinitions('organisation'),
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
          title={organisation.name}
          description={organisation.industry ?? undefined}
          action={
            <Badge tone={organisation.kind === 'client' ? 'ok' : 'info'}>{organisation.kind}</Badge>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Timeline organisationId={id} entries={timeline} canWrite={editable} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardSection title="Details">
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
                }}
              />
            </CardSection>
          </Card>

          <ContactsPanel organisationId={id} contacts={contacts} canWrite={editable} />
          <LocationsPanel organisationId={id} locations={locations} canWrite={editable} />
        </div>
      </div>
    </div>
  );
}

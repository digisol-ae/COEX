import { PlanCatalogue } from './plan-catalogue';
import { listSubscriptionPlans } from '@/modules/core/services/plan-catalogue.service';
import { asUser, requirePermission } from '@/lib/session';
import { listTenants } from '@/modules/core/services/tenant.service';
import { Badge, Card, PageHeader, Table, Td, Th } from '@/components/ui';
import { CreateTenantPanel } from './create-tenant-panel';
import { ProvisioningDefaults, TenantCommercialControls } from './commercial-controls';
import { provisioningDefaults } from '@/modules/core/services/platform-settings.service';
import { formatStorage } from '@coex/shared/core/saas';
import { RegistrationControls, TrialApplications } from './registration-controls';
import {
  getRegistrationControls,
  listTrialApplications,
} from '@/modules/core/services/trial-registration.service';

export const metadata = { title: 'Tenants · Worktello' };

/**
 * Platform administration. Creating a second tenant here, and seeing that its data never appears
 * inside the first, is the acceptance test for milestone one.
 */
export default async function TenantsPage() {
  const actor = await requirePermission('tenant.create');
  const tenants = await asUser(actor, listTenants);
  const plans = await asUser(actor, listSubscriptionPlans);
  const defaults = await asUser(actor, provisioningDefaults);
  const registration = await asUser(actor, getRegistrationControls);
  const applications = await asUser(actor, listTrialApplications);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title="Tenants"
        description="Every tenant is a separate company with its own users, customers and records. Nothing is shared between them."
        action={<CreateTenantPanel />}
      />

      <PlanCatalogue plans={plans} />
      <ProvisioningDefaults {...defaults} />
      <RegistrationControls {...registration} />
      <TrialApplications applications={applications} />
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Identifier</Th>
              <Th>Staff / seats</Th>
              <Th>Portal accounts</Th>
              <Th>Plan / access through</Th>
              <Th>Status</Th>
              <Th>Trial ends</Th>
              <Th>Storage used / allowance</Th>
              <Th>Manage</Th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id}>
                <Td>
                  <span className="font-medium text-[var(--color-ink)]">{tenant.name}</span>
                </Td>
                <Td className="font-mono text-xs text-[var(--color-ink-muted)]">{tenant.slug}</Td>
                <Td className="text-[var(--color-ink-muted)]">
                  {tenant.staffCount} / {tenant.seats ?? 'Unconfigured'}
                </Td>
                <Td>{tenant.portalCount}</Td>
                <Td>
                  {tenant.plan ?? 'Unassigned'}
                  <br />
                  {tenant.accessEndsAt?.toLocaleDateString('en-GB', { timeZone: 'UTC' }) ?? '—'}
                </Td>
                <Td>
                  <Badge tone={tenant.access === 'allowed' ? 'ok' : 'warn'}>
                    {tenant.access === 'allowed'
                      ? tenant.commercialStatus
                      : tenant.access.replaceAll('_', ' ')}
                  </Badge>
                </Td>
                <Td className="text-[var(--color-ink-muted)]">
                  {tenant.commercialStatus === 'trialing'
                    ? (tenant.trialEndsAt?.toLocaleDateString('en-GB', { timeZone: 'UTC' }) ?? '—')
                    : '—'}
                </Td>
                <Td>
                  {formatStorage(tenant.storageUsedBytes)} /{' '}
                  {formatStorage(tenant.storageLimitBytes)}
                </Td>
                <Td>
                  <TenantCommercialControls
                    plans={plans.filter((plan) => plan.active)}
                    subscription={{
                      plan: tenant.plan,
                      seats: tenant.seats,
                      status: tenant.commercialStatus,
                      accessEndsAt: tenant.accessEndsAt?.toISOString().slice(0, 10) ?? '',
                    }}
                    tenantName={tenant.name}
                    modules={tenant.modules}
                    effectiveModules={tenant.effectiveModules}
                    tenantId={tenant.id}
                    storageLimitBytes={tenant.storageLimitBytes}
                    trial={['trialing', 'expired'].includes(tenant.commercialStatus)}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

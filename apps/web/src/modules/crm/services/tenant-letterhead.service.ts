import type { TenantLetterhead } from '@coex/shared/crm/letterhead';
import { getCurrentTenant } from '@/modules/core/services/tenant.service';

export async function getTenantLetterhead(): Promise<TenantLetterhead> {
  const tenant = await getCurrentTenant();
  const details = tenant.branding?.letterhead;
  return {
    name: tenant.name,
    logoDataUrl: details?.logoDataUrl ?? '',
    address: details?.address ?? '',
    contact: details?.contact ?? '',
    footer: details?.footer ?? '',
    color: tenant.branding?.primaryColor ?? '#0f172a',
  };
}

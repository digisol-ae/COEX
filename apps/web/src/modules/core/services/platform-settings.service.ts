import { PlatformSettingsModel } from '@coex/shared/core/models/platform-settings.model';
import {
  DEFAULT_STORAGE_LIMIT_BYTES,
  DEFAULT_TRIAL_DAYS,
  positiveInteger,
} from '@coex/shared/core/saas';
import { connectToDatabase } from '@/lib/db';
import { recordAudit } from './audit.service';
import { requirePlatformAdministrator } from './platform-access.service';

/** Internal provisioning defaults. This read contains no credentials or customer information. */
export async function provisioningDefaults() {
  await connectToDatabase();
  const settings = await PlatformSettingsModel.findOne({ key: 'platform' });
  return {
    trialDays: settings?.trialDays ?? DEFAULT_TRIAL_DAYS,
    storageLimitBytes: settings?.storageLimitBytes ?? DEFAULT_STORAGE_LIMIT_BYTES,
  };
}

export async function updateProvisioningDefaults(input: {
  trialDays: number;
  storageLimitBytes: number;
}) {
  await requirePlatformAdministrator();
  positiveInteger(input.trialDays, 'Trial days', 365);
  positiveInteger(input.storageLimitBytes, 'Storage bytes');
  const before = await provisioningDefaults();
  await PlatformSettingsModel.findOneAndUpdate(
    { key: 'platform' },
    { $set: input },
    { upsert: true, runValidators: true },
  );
  await recordAudit({
    action: 'platform.provisioning_defaults_updated',
    entityType: 'PlatformSettings',
    before,
    after: input,
  });
}

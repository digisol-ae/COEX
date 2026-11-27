import { publishedWebsite, websiteEditor } from './website-content.service';
import { provisioningDefaults } from './platform-settings.service';

/** Versioned read contract for the separate public website. Never include editor state here. */
export async function publicWebsiteDelivery() {
  const [content, defaults] = await Promise.all([publishedWebsite(), provisioningDefaults()]);
  return {
    schemaVersion: 1 as const,
    content: content ?? null,
    defaults: { trialDays: defaults.trialDays, storageLimitBytes: defaults.storageLimitBytes },
  };
}

/** websiteEditor rechecks the stored active platform owner before ANY draft or published preview. */
export async function privateWebsiteDelivery(published: boolean) {
  const editor = await websiteEditor();
  const defaults = await provisioningDefaults();
  return {
    schemaVersion: 1 as const,
    content: (published ? await publishedWebsite() : editor.draft) ?? null,
    defaults: { trialDays: defaults.trialDays, storageLimitBytes: defaults.storageLimitBytes },
  };
}

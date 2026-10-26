import { randomUUID } from 'node:crypto';
import { ReleaseContentModel } from '@coex/shared/core/models/release-content.model';
import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { RELEASE_NOTES } from '../release-notes';
import {
  applyReleaseCommand,
  publishedContent,
  type ReleaseContentState,
  type ReleaseCommand,
} from '../release-content';
import { recordAudit } from './audit.service';

export async function getReleaseContent(): Promise<ReleaseContentState> {
  await connectToDatabase();
  const content = await ReleaseContentModel.findOne({ tenantId: getContext().tenantId }).lean();
  if (!content)
    return {
      version: 0,
      entries: RELEASE_NOTES.map((release) => ({
        draft: release,
        published: release,
        revision: release.id,
      })),
    };
  // Strip Mongoose internals before sending content to a client component.
  return { version: content.version, entries: JSON.parse(JSON.stringify(content.entries)) };
}

export async function getPublishedReleases() {
  return publishedContent(await getReleaseContent());
}

export async function changeReleaseContent(version: number, command: ReleaseCommand) {
  if (!Number.isInteger(version) || version < 0) throw new Error('Invalid content version.');
  const current = await getReleaseContent();
  if (current.version !== version)
    throw new Error('Content changed in another session. Reload before saving.');
  const next = applyReleaseCommand(current, command, randomUUID());
  const { tenantId } = getContext();
  if (version === 0) {
    try {
      await ReleaseContentModel.create({ tenantId, ...next });
    } catch (error) {
      if ((error as { code?: number }).code === 11000)
        throw new Error('Content changed in another session. Reload before saving.');
      throw error;
    }
  } else {
    const result = await ReleaseContentModel.updateOne({ tenantId, version }, { $set: next });
    if (!result.modifiedCount)
      throw new Error('Content changed in another session. Reload before saving.');
  }
  await recordAudit({
    action: `release_content.${command.kind}`,
    entityType: 'ReleaseContent',
    after: { id: command.kind === 'save' ? command.draft.id : command.id, version: next.version },
  });
  return next;
}

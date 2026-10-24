import { SettingsDrawer } from '@/components/ui/settings-drawer';
import { asUser, requirePermission } from '@/lib/session';
import { getStaleDays, listLostReasons, listStages } from '@/modules/crm/services/pipeline.service';
import { PageHeader } from '@/components/ui';
import { PipelineEditor } from './pipeline-editor';

export const metadata = { title: 'Pipeline · Worktello' };

export default async function PipelinePage() {
  const actor = await requirePermission('pipeline.manage');
  const [stages, lostReasons, staleDays] = await asUser(actor, () =>
    Promise.all([listStages(), listLostReasons(), getStaleDays()]),
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Pipeline"
        description="One pipeline for all sales. A stage cannot be renamed or removed while opportunities sit in it. Won and Lost are fixed and always last."
      />
      <SettingsDrawer title="Pipeline settings" summary="Stages, lost reasons and reminder rules">
        <PipelineEditor stages={stages} lostReasons={lostReasons} staleDays={staleDays} />
      </SettingsDrawer>
    </div>
  );
}

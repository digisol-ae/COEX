import { asUser, requirePermission } from '@/lib/session';
import { listLostReasons, listStages } from '@/modules/crm/services/pipeline.service';
import { PageHeader } from '@/components/ui';
import { PipelineEditor } from './pipeline-editor';

export const metadata = { title: 'Pipeline · COEX' };

export default async function PipelinePage() {
  const actor = await requirePermission('pipeline.manage');
  const [stages, lostReasons] = await asUser(actor, () =>
    Promise.all([listStages(), listLostReasons()]),
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Pipeline"
        description="One pipeline for all sales. A stage cannot be renamed or removed while opportunities sit in it. Won and Lost are fixed and always last."
      />
      <PipelineEditor stages={stages} lostReasons={lostReasons} />
    </div>
  );
}

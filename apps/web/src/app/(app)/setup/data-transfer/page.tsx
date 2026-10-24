import { requirePermission } from '@/lib/session';
import { PageHeader } from '@/components/ui';
import { TransferPanel } from './transfer-panel';
export const metadata = { title: 'Import and export · Worktello' };
export default async function DataTransferPage() {
  await requirePermission('tenant.manage');
  return (
    <>
      <PageHeader title="Import and export" />
      <TransferPanel />
    </>
  );
}

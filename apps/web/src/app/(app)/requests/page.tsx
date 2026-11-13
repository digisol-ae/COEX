import Link from 'next/link';
import { asUser, requireStaffUser } from '@/lib/session';
import { repository } from '@/lib/repository';
import { TaskModel } from '@coex/shared/tasks/models/task.model';
import { myContractSigningRequests } from '@/modules/crm/services/agreement-signature.service';
import { getTask } from '@/modules/tasks/services/task.service';
import { PageHeader } from '@/components/ui';

export default async function RequestsPage() {
  const actor = await requireStaffUser();
  const [contracts, tasks] = await asUser(actor, async () =>
    Promise.all([
      actor.permissions.includes('contract.read') ? myContractSigningRequests() : [],
      actor.permissions.includes('task.read.all')
        ? (async () => {
            const pending = await repository(TaskModel)
              .find({ 'review.reviewerId': actor.id, 'review.reviewedAt': null })
              .select('_id')
              .sort({ 'review.requestedAt': -1 });
            return Promise.all(pending.map(({ _id }) => getTask(String(_id))));
          })()
        : [],
    ]),
  );
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Requests and Approvals" />
      <section className="space-y-3 rounded border p-5">
        <h2 className="font-semibold">Contracts awaiting your signature</h2>
        {contracts.length === 0 && <p>No contracts to sign.</p>}
        <ul>
          {contracts.map((contract) => (
            <li key={String(contract._id)}>
              <Link className="underline" href={`/requests/${contract._id}`}>
                {contract.contractNumber} · {contract.customerName}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-3 rounded border p-5">
        <h2 className="font-semibold">Tasks awaiting your review</h2>
        {!tasks.some(Boolean) && <p>No tasks to review.</p>}
        <ul>
          {tasks.map(
            (task) =>
              task && (
                <li key={String(task._id)}>
                  <Link className="underline" href={`/tasks/${task._id}`}>
                    {task.title}
                  </Link>
                </li>
              ),
          )}
        </ul>
      </section>
    </div>
  );
}

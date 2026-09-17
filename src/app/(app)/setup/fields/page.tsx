import { asUser, requirePermission } from '@/lib/session';
import { listFieldDefinitions } from '@/modules/crm/services/field-definition.service';
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from '@/components/ui';
import { NewFieldPanel } from './new-field-panel';
import { FieldToggle } from './field-toggle';

export const metadata = { title: 'Custom fields · COEX' };

const ENTITY_LABEL: Record<string, string> = {
  organisation: 'Customer',
  contact: 'Contact',
  location: 'Site',
  task: 'Task',
  ticket: 'Ticket',
};

export default async function FieldsPage() {
  const actor = await requirePermission('tenant.manage');
  const fields = await asUser(actor, () => listFieldDefinitions(undefined, true));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Custom fields"
        description="Extra fields on your records, defined here rather than in code. A field is hidden rather than deleted, so values already recorded against it are never orphaned."
        action={<NewFieldPanel />}
      />

      <Card>
        {fields.length === 0 ? (
          <EmptyState message="No custom fields yet. The standard fields cover most work." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Field</Th>
                <Th>On</Th>
                <Th>Type</Th>
                <Th>Required</Th>
                <Th>{''}</Th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => (
                <tr key={field.id}>
                  <Td>
                    <div className="font-medium text-[var(--color-ink)]">{field.label}</div>
                    <div className="font-mono text-xs text-[var(--color-ink-subtle)]">
                      {field.key}
                    </div>
                  </Td>
                  <Td className="text-[var(--color-ink-muted)]">
                    {ENTITY_LABEL[field.entityType] ?? field.entityType}
                  </Td>
                  <Td>
                    <Badge tone={field.status === 'active' ? 'neutral' : 'warn'}>
                      {field.status === 'active' ? field.type : 'hidden'}
                    </Badge>
                  </Td>
                  <Td className="text-[var(--color-ink-muted)]">{field.required ? 'Yes' : 'No'}</Td>
                  <Td>
                    <FieldToggle id={field.id} status={field.status} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

import { z } from 'zod';
import { readTeamsTab, writeTeamsTab, withTeamsTabActor, TeamsTabError } from './tab.service';
import { normalizeCopilotPreview, readCopilotPreview, signCopilotPreview } from './copilot-preview';
import type { TeamsFormData } from './form-model';
import { TASK_TIME_ZONE } from '@coex/shared/tasks/dates';

export async function copilotOptions(token: string) {
  const data = (await readTeamsTab(token, { action: 'form' }, 'copilot')) as TeamsFormData;
  return {
    actorId: data.actorId,
    canAssignOthers: data.canAssignOthers,
    spaces: data.spaces,
    folders: data.folders,
    people: data.canAssignOthers ? data.people : data.people.filter((p) => p.id === data.actorId),
    officeTimezone: TASK_TIME_ZONE,
    currentDateTime: new Date().toISOString(),
    instructions:
      'Use only returned IDs. Ask about ambiguous names or destinations. Default assignee is actorId. Dates and times use officeTimezone. This endpoint does not create tasks.',
  };
}

export async function copilotPrepare(token: string, raw: unknown) {
  const data = (await readTeamsTab(token, { action: 'form' }, 'copilot')) as TeamsFormData;
  let preview: ReturnType<typeof normalizeCopilotPreview>;
  try {
    preview = normalizeCopilotPreview(raw, data);
  } catch (cause) {
    throw new TeamsTabError(
      400,
      cause instanceof z.ZodError
        ? 'Check the task title, destination, assignees and due date/time.'
        : cause instanceof Error
          ? cause.message
          : 'Check the task details.',
    );
  }
  return withTeamsTabActor(
    token,
    async (actorId, settings) => ({
      previewToken: await signCopilotPreview(
        preview.fields,
        actorId,
        settings.tenantId,
        settings.secret,
      ),
      ...preview.summary,
      officeTimezone: TASK_TIME_ZONE,
      instructions:
        'No task has been created. Show these exact details to the user for review. Only use this previewToken with CreateWorktelloTask after confirmation. Changed details require a new preview. Never display or link the previewToken.',
    }),
    'copilot',
  );
}

export async function copilotCreate(token: string, raw: unknown) {
  const input = z.strictObject({ previewToken: z.string().min(1).max(24000) }).safeParse(raw);
  if (!input.success) throw new TeamsTabError(400, 'Review a task preview first.');
  const preview = await withTeamsTabActor(
    token,
    async (actorId, settings) => {
      try {
        return await readCopilotPreview(
          input.data.previewToken,
          actorId,
          settings.tenantId,
          settings.secret,
        );
      } catch {
        throw new TeamsTabError(
          400,
          'This preview expired or changed. Review a new preview before creating the task.',
        );
      }
    },
    'copilot',
  );
  // The shared create path rechecks current access and reserves a tenant/user/request receipt.
  const result = await writeTeamsTab(
    token,
    {
      action: 'create',
      requestId: preview.requestId,
      fields: preview.fields,
      assigneeIds: preview.fields.assigneeIds,
    },
    'copilot',
  );
  return withTeamsTabActor(
    token,
    async (_actorId, settings) => ({
      taskId: 'taskId' in result ? result.taskId : undefined,
      url: 'taskId' in result ? `${settings.url}/tasks/${result.taskId}` : undefined,
      message: 'Task created in Worktello.',
    }),
    'copilot',
  );
}

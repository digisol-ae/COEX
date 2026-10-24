import type { loadTeamsForm } from './teams.service';

export type TeamsFormData = Omit<Awaited<ReturnType<typeof loadTeamsForm>>, 'canAssignOthers'> & {
  canAssignOthers?: boolean;
  canViewOthers?: boolean;
};

export function formChoices(data: TeamsFormData, spaceId: string, folderId: string) {
  const space = data.spaces.find((s) => s.id === spaceId);
  const folders = data.folders.filter((f) => f.spaceId === spaceId);
  const folder = folders.find((f) => f.id === folderId);
  const people = space
    ? data.people.filter(
        (p) =>
          (!space.memberIds.length || space.memberIds.includes(p.id)) &&
          (!folder?.memberIds.length || folder.memberIds.includes(p.id)),
      )
    : [];
  return { folders, people };
}

export function defaultAssignee(data: TeamsFormData, spaceId: string, folderId: string) {
  return formChoices(data, spaceId, folderId).people.some((p) => p.id === data.actorId)
    ? data.actorId
    : '';
}

export type SpaceStatus = { name: string; isClosed: boolean };
export function validateSpaceStatuses(input: unknown): SpaceStatus[] {
  if (!Array.isArray(input) || input.length < 2 || input.length > 20)
    throw new Error('Use between 2 and 20 statuses.');
  const statuses = input.map((value) => {
    if (!value || typeof value.name !== 'string' || typeof value.isClosed !== 'boolean')
      throw new Error('Each status needs a name and completion flag.');
    const name = value.name.trim();
    if (!name || name.length > 80) throw new Error('Status names must have 1 to 80 characters.');
    return { name, isClosed: value.isClosed };
  });
  if (new Set(statuses.map((s) => s.name.toLowerCase())).size !== statuses.length)
    throw new Error('Status names must be unique.');
  if (statuses.filter((s) => s.isClosed).length !== 1)
    throw new Error('Choose exactly one completed status.');
  return statuses;
}

/** Avoid orphaning tasks or silently changing what their saved status means. */
export function assertUsedStatusesPreserved(
  before: SpaceStatus[],
  after: SpaceStatus[],
  used: string[],
) {
  for (const name of used) {
    const oldStatus = before.find((status) => status.name === name);
    const next = after.find((status) => status.name === name);
    if (!next) throw new Error('Move tasks out of "' + name + '" before renaming or removing it.');
    if (oldStatus && oldStatus.isClosed !== next.isClosed)
      throw new Error('Move tasks out of "' + name + '" before changing its completion flag.');
  }
}

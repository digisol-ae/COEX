import { validSchedule } from './gantt';
type When = Date | string | null;
export interface GanttTask {
  id: string;
  title: string;
  number: string;
  status: string;
  startAt: When;
  endAt: When;
  isClosed: boolean;
  assigneeNames: string[];
  subtasks: {
    id: string;
    title: string;
    done: boolean;
    assigneeId: string | null;
    assigneeName?: string | null;
    startAt?: When;
    endAt?: When;
  }[];
}
export type GanttItem<T extends GanttTask = GanttTask> = T & {
  parentTaskId: string;
  subtaskId: string | null;
  parentTitle: string | null;
  inherited: boolean;
  derived: boolean;
  locked: boolean;
  storedStartAt: When;
  storedEndAt: When;
};
/** Group children with their parent; absent child dates explicitly inherit the parent window. */
export function ganttItems<T extends GanttTask>(tasks: T[]): GanttItem<T>[] {
  return [...tasks]
    .sort((a, b) => {
      const first = (t: T) =>
        validSchedule(t.startAt, t.endAt)
          ? new Date(t.startAt!).getTime()
          : Math.min(
              Infinity,
              ...t.subtasks
                .filter((s) => validSchedule(s.startAt ?? null, s.endAt ?? null))
                .map((s) => new Date(s.startAt!).getTime()),
            );
      return first(a) - first(b) || a.number.localeCompare(b.number, undefined, { numeric: true });
    })
    .flatMap((task) => {
      const scheduled = task.subtasks.filter((s) =>
        validSchedule(s.startAt ?? null, s.endAt ?? null),
      );
      const derived = !validSchedule(task.startAt, task.endAt) && scheduled.length > 0;
      const startAt = derived
        ? new Date(Math.min(...scheduled.map((s) => new Date(s.startAt!).getTime())))
        : task.startAt;
      const endAt = derived
        ? new Date(Math.max(...scheduled.map((s) => new Date(s.endAt!).getTime())))
        : task.endAt;
      const parent: GanttItem<T> = {
        ...task,
        startAt,
        endAt,
        parentTaskId: task.id,
        subtaskId: null,
        parentTitle: null,
        inherited: false,
        locked: task.isClosed,
        derived,
        storedStartAt: task.startAt,
        storedEndAt: task.endAt,
      };
      return [
        parent,
        ...task.subtasks.map((sub) => {
          const own = validSchedule(sub.startAt ?? null, sub.endAt ?? null);
          return {
            ...task,
            id: `${task.id}:${sub.id}`,
            title: sub.title,
            status: sub.done ? 'Done' : 'Open',
            isClosed: sub.done,
            locked: task.isClosed || sub.done,
            subtasks: [],
            assigneeNames: sub.assigneeName ? [sub.assigneeName] : [],
            startAt: own ? sub.startAt! : startAt,
            endAt: own ? sub.endAt! : endAt,
            parentTaskId: task.id,
            subtaskId: sub.id,
            parentTitle: task.title,
            inherited: !own,
            derived: false,
            storedStartAt: sub.startAt ?? null,
            storedEndAt: sub.endAt ?? null,
          } as GanttItem<T>;
        }),
      ];
    });
}

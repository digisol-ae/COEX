import { expect, it } from 'vitest';
import { ganttItems, type GanttTask } from '@coex/shared/tasks/gantt-items';
import { buildGanttPDF } from '@/modules/tasks/gantt-report';
import { PDFDocument } from 'pdf-lib';
const task: GanttTask = {
  id: 'parent',
  number: 'T-1',
  title: 'Parent',
  status: 'In progress',
  isClosed: false,
  assigneeNames: ['Parent owner'],
  startAt: '2026-10-28T05:00:00Z',
  endAt: '2026-10-30T13:00:00Z',
  subtasks: [
    { id: 'sub1', title: 'Inherited', done: false, assigneeId: null },
    {
      id: 'sub2',
      title: 'Independent',
      done: true,
      assigneeId: 'agent',
      assigneeName: 'Child owner',
      startAt: '2026-11-02T05:00:00Z',
      endAt: '2026-11-03T13:00:00Z',
    },
  ],
};
it('keeps parent and children together, distinguishes inherited and explicit dates and preserves ownership', () => {
  const rows = ganttItems([task]);
  expect(rows.map((row) => row.id)).toEqual(['parent', 'parent:sub1', 'parent:sub2']);
  expect(rows[1]).toMatchObject({
    startAt: task.startAt,
    inherited: true,
    assigneeNames: [],
    storedStartAt: null,
  });
  expect(rows[2]).toMatchObject({
    inherited: false,
    isClosed: true,
    status: 'Done',
    assigneeNames: ['Child owner'],
  });
});
it('derives an undated parent envelope without inventing saved parent dates and retains fully undated work', () => {
  const rows = ganttItems([{ ...task, startAt: null, endAt: null }]);
  expect(rows[0]).toMatchObject({
    derived: true,
    storedStartAt: null,
    startAt: new Date('2026-11-02T05:00:00Z'),
  });
  const empty = ganttItems([{ ...task, startAt: null, endAt: null, subtasks: [task.subtasks[0]] }]);
  expect(empty[1].startAt).toBeNull();
});
it('exports multi-page charts and an empty chart with valid page geometry', async () => {
  const tasks = Array.from({ length: 12 }, (_, i) => ({
    ...task,
    id: `p${i}`,
    number: `T-${i + 1}`,
  }));
  const bytes = await buildGanttPDF({ title: 'QA Gantt', tasks, now: '2026-10-28T10:00:00Z' });
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBe(3);
  expect(pdf.getPage(0).getSize()).toEqual({ width: 842, height: 595 });
  const collapsed = await PDFDocument.load(
    await buildGanttPDF({ title: 'QA', tasks, now: '2026-10-28T10:00:00Z', showSubtasks: false }),
  );
  expect(collapsed.getPageCount()).toBe(1);
  const empty = await PDFDocument.load(
    await buildGanttPDF({ title: 'Empty', tasks: [], now: '2026-10-28T10:00:00Z' }),
  );
  expect(empty.getPageCount()).toBe(1);
});

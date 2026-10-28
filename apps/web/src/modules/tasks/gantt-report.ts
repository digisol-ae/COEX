import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { ganttItems, type GanttTask } from '@coex/shared/tasks/gantt-items';
import { GANTT_DAY, scheduleRange, validSchedule } from '@coex/shared/tasks/gantt';
import { TASK_TIME_ZONE } from '@coex/shared/tasks/dates';
import { safeText } from '@/modules/time/activity-report';
export async function buildGanttPDF(input: {
  title: string;
  tasks: GanttTask[];
  now: string;
  showSubtasks?: boolean;
  collapsedIds?: string[];
}) {
  const all = ganttItems(input.tasks);
  const collapsed = new Set(input.collapsedIds ?? []);
  const rows = all.filter(
    (row) => !row.subtaskId || (input.showSubtasks !== false && !collapsed.has(row.parentTaskId)),
  );
  const range = scheduleRange(all, input.now);
  const daysPerPanel = Math.max(28, Math.ceil(range.days / 12));
  const panels = Math.ceil(range.days / daysPerPanel),
    perPage = 14;
  const batches = Math.max(1, Math.ceil(rows.length / perPage));
  if (panels * batches > 100)
    throw new Error('The chart is too large for one PDF. Narrow the task filters.');
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica),
    bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = 842,
    height = 595,
    margin = 28,
    labelWidth = 285,
    chartX = margin + labelWidth,
    chartWidth = width - margin - chartX;
  const ink = rgb(0.12, 0.15, 0.2),
    muted = rgb(0.4, 0.43, 0.48),
    line = rgb(0.85, 0.87, 0.9),
    blue = rgb(0.23, 0.42, 0.75),
    green = rgb(0.2, 0.5, 0.36),
    pale = rgb(0.95, 0.96, 0.98);
  const day = (time: number) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TASK_TIME_ZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(time));
  const fit = (value: string, font: PDFFont, size: number, limit: number) => {
    let text = safeText(value);
    if (font.widthOfTextAtSize(text, size) <= limit) return text;
    while (text.length && font.widthOfTextAtSize(text + '...', size) > limit)
      text = text.slice(0, -1);
    return text + '...';
  };
  for (let panel = 0; panel < panels; panel++)
    for (let batch = 0; batch < batches; batch++) {
      const page = pdf.addPage([width, height]);
      const text = (value: string, x: number, y: number, size = 9, font = regular, color = ink) =>
        page.drawText(safeText(value), { x, y, size, font, color });
      const first = range.start + panel * daysPerPanel * GANTT_DAY,
        days = Math.min(daysPerPanel, range.days - panel * daysPerPanel),
        until = first + days * GANTT_DAY,
        dayWidth = chartWidth / days;
      text(fit(input.title, bold, 17, width - 2 * margin), margin, height - 38, 17, bold);
      text(
        `${input.tasks.length} ${input.tasks.length === 1 ? 'task' : 'tasks'} | ${rows.filter((row) => row.subtaskId).length} visible subtasks | Dubai time (UTC+04:00)`,
        margin,
        height - 57,
        9,
        regular,
        muted,
      );
      text(
        `${day(first)} - ${day(until - 1)} | Saved dates | Dashed outline: parent window`,
        margin,
        height - 73,
        9,
        regular,
        muted,
      );
      const top = height - 112,
        rowHeight = 28,
        bottom = top - Math.max(1, Math.min(perPage, rows.length - batch * perPage)) * rowHeight;
      text('TASK / SUBTASK - STATUS & OWNER', margin, top + 13, 8, bold, muted);
      const step = Math.max(1, Math.ceil(days / 8));
      for (let index = 0; index < days; index++) {
        const at = first + index * GANTT_DAY,
          x = chartX + index * dayWidth;
        const weekday = new Intl.DateTimeFormat('en-GB', {
          timeZone: TASK_TIME_ZONE,
          weekday: 'short',
        }).format(new Date(at));
        if (weekday === 'Sat' || weekday === 'Sun')
          page.drawRectangle({ x, y: bottom, width: dayWidth, height: top - bottom, color: pale });
        if (index % step === 0) {
          page.drawLine({
            start: { x, y: bottom },
            end: { x, y: top },
            color: line,
            thickness: 0.5,
          });
          text(
            new Intl.DateTimeFormat('en-GB', {
              timeZone: TASK_TIME_ZONE,
              day: 'numeric',
              month: 'short',
            }).format(new Date(at)),
            x + 2,
            top + 13,
            7,
            regular,
            muted,
          );
        }
      }
      const today = Date.parse(input.now);
      if (today >= first && today < until) {
        const x = chartX + ((today - first) / GANTT_DAY) * dayWidth;
        page.drawLine({
          start: { x, y: bottom },
          end: { x, y: top },
          color: rgb(0.8, 0.2, 0.25),
          thickness: 1,
        });
      }
      const slice = rows.slice(batch * perPage, (batch + 1) * perPage);
      if (!slice.length) text('No tasks match the current filters.', margin, top - 20);
      slice.forEach((row, index) => {
        const y = top - (index + 1) * rowHeight;
        page.drawLine({
          start: { x: margin, y },
          end: { x: width - margin, y },
          color: line,
          thickness: 0.5,
        });
        const indent = row.subtaskId ? 12 : 0;
        text(
          fit(
            `${row.subtaskId ? `> ${row.number} / ` : row.number + ' '}${row.title}`,
            row.subtaskId ? regular : bold,
            9,
            labelWidth - indent - 10,
          ),
          margin + indent,
          y + 16,
          9,
          row.subtaskId ? regular : bold,
        );
        text(
          fit(
            `${row.status} | ${row.assigneeNames.join(', ') || 'Unassigned'}${row.inherited ? ' | parent window' : row.derived ? ' | from subtasks' : ''}`,
            regular,
            7,
            labelWidth - indent - 10,
          ),
          margin + indent,
          y + 5,
          7,
          regular,
          muted,
        );
        if (!validSchedule(row.startAt, row.endAt)) {
          text('Not scheduled', chartX + 8, y + 10, 8, regular, muted);
          return;
        }
        const a = Math.max(first, new Date(row.startAt!).getTime()),
          b = Math.min(until, new Date(row.endAt!).getTime());
        if (b <= a) return;
        const x = chartX + ((a - first) / GANTT_DAY) * dayWidth,
          w = Math.max(1, ((b - a) / GANTT_DAY) * dayWidth);
        page.drawRectangle({
          x,
          y: y + 8,
          width: w,
          height: 12,
          color: row.isClosed ? green : blue,
          opacity: row.inherited ? 0.35 : 0.9,
        });
        if (row.inherited) {
          page.drawLine({
            start: { x, y: y + 8 },
            end: { x: x + w, y: y + 8 },
            color: blue,
            thickness: 1,
            dashArray: [3, 2],
          });
          page.drawLine({
            start: { x, y: y + 20 },
            end: { x: x + w, y: y + 20 },
            color: blue,
            thickness: 1,
            dashArray: [3, 2],
          });
        }
        if (new Date(row.startAt!).getTime() < first) text('<', chartX + 2, y + 10, 8, bold);
        if (new Date(row.endAt!).getTime() > until) text('>', width - margin - 8, y + 10, 8, bold);
      });
      const pageNumber = panel * batches + batch + 1;
      text(
        `Worktello | Generated ${day(Date.parse(input.now))} | Blue: open | Green: completed | Red line: today`,
        margin,
        22,
        8,
        regular,
        muted,
      );
      text(`${pageNumber} / ${panels * batches}`, width - margin - 45, 22, 8, regular, muted);
    }
  return Buffer.from(await pdf.save());
}

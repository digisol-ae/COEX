import { createElement as el, Fragment, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { sortTableRows } from '@/components/ui/sortable-table';
import { compareSortValues } from '@/components/ui/table-sort';
const row = (key: string, values: (string | number | null)[]) =>
  el('tr', { key, 'data-sort-values': JSON.stringify(values) }, el('td', null, key));
const keys = (rows: ReturnType<typeof sortTableRows>) =>
  rows.map((value) => (value as ReactElement).key?.split('$').pop());
describe('table sorting', () => {
  it('sorts real numeric values rather than their printed strings', () => {
    expect(keys(sortTableRows([row('ten', [10]), row('two', [2])], 0, false))).toEqual([
      'two',
      'ten',
    ]);
    expect(compareSortValues('1h 5m', '55m')).toBeGreaterThan(0);
  });
  it('toggles descending and keeps missing dates last', () => {
    expect(
      keys(sortTableRows([row('missing', [null]), row('early', [1]), row('late', [9])], 0, true)),
    ).toEqual(['late', 'early', 'missing']);
  });
  it('keeps expanded subtasks with their parent and capture rows at the bottom', () => {
    const group = el(
      Fragment,
      { key: 'group' },
      row('parent', ['A']),
      el('tr', { key: 'subtask' }, el('td', { colSpan: 3 }, 'Detail')),
    );
    const capture = el('tr', { key: 'capture' }, el('td', { colSpan: 3 }, 'Add task'));
    const sorted = sortTableRows([row('z', ['Z']), capture, group], 0, false);
    expect(keys(sorted)).toEqual(['group', 'z', 'capture']);
    expect((sorted[0] as ReactElement).type).toBe(Fragment);
  });
  it('reads explicit values on a component row without unmounting its editor', () => {
    const component = (props: { sortValues: number[] }) =>
      el('tr', null, el('td', null, props.sortValues[0]));
    const rows = [
      el(component, { key: 'later', sortValues: [9] }),
      el(component, { key: 'first', sortValues: [1] }),
    ];
    expect(keys(sortTableRows(rows, 0, false))).toEqual(['first', 'later']);
  });
  it('uses natural text order and preserves ties', () => {
    expect(
      keys(
        sortTableRows(
          [row('second', ['TASK-2']), row('tenth', ['TASK-10']), row('same', ['TASK-2'])],
          0,
          false,
        ),
      ),
    ).toEqual(['second', 'same', 'tenth']);
  });
});

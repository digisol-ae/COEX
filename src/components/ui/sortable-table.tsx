'use client';
import {
  Children,
  cloneElement,
  isValidElement,
  useState,
  type ReactNode,
  type ReactElement,
} from 'react';
import { compareSortValues, type SortValue } from './table-sort';

type ElementProps = {
  children?: ReactNode;
  sortValues?: SortValue[];
  'data-sort-values'?: string;
  'data-sort-value'?: SortValue;
  colSpan?: number;
  draggable?: boolean;
  'aria-sort'?: 'ascending' | 'descending' | 'none';
};
type Element = ReactElement<ElementProps>;
const nodes = (children: ReactNode) => Children.toArray(children);
function text(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (isValidElement<ElementProps>(node)) return text(node.props.children);
  if (Array.isArray(node)) return node.map(text).join(' ');
  return '';
}
function values(node: ReactNode): SortValue[] | null {
  if (!isValidElement<ElementProps>(node)) return null;
  if (node.props.sortValues) return node.props.sortValues;
  if (node.props['data-sort-values']) return JSON.parse(node.props['data-sort-values']);
  if (node.type === 'tr') {
    const cells = nodes(node.props.children).filter(isValidElement<ElementProps>);
    if (cells.some((cell) => (cell.props.colSpan ?? 1) > 1)) return null;
    return cells.map((cell) => cell.props['data-sort-value'] ?? text(cell.props.children).trim());
  }
  for (const child of nodes(node.props.children)) {
    const found = values(child);
    if (found) return found;
  }
  return null;
}

/** Sort React row groups, preserving task/subtask adjacency and row component state. */
export function SortableTable({
  children,
  className = 'w-full border-collapse text-sm',
}: {
  children: ReactNode;
  className?: string;
}) {
  const [sort, setSort] = useState<{ column: number; descending: boolean } | null>(null);
  const toggle = (column: number) =>
    setSort((current) => ({
      column,
      descending: current?.column === column ? !current.descending : false,
    }));

  const sections = nodes(children).map((section) => {
    if (!isValidElement<ElementProps>(section)) return section;
    if (section.type === 'thead') {
      return cloneElement(
        section,
        {},
        nodes(section.props.children).map((row) => {
          if (!isValidElement<ElementProps>(row)) return row;
          return cloneElement(
            row,
            {},
            nodes(row.props.children).map((cell, column) => {
              if (!isValidElement<ElementProps>(cell) || !text(cell.props.children).trim())
                return cell;
              const label = text(cell.props.children).trim();
              const active = sort?.column === column;
              return cloneElement(
                cell as Element,
                { 'aria-sort': active ? (sort.descending ? 'descending' : 'ascending') : 'none' },
                <button
                  type="button"
                  onClick={() => toggle(column)}
                  aria-label={
                    'Sort by ' +
                    label +
                    (active && !sort.descending ? ', descending' : ', ascending')
                  }
                  className="inline-flex items-center gap-1 whitespace-nowrap hover:text-[var(--color-ink)] focus-visible:outline-2"
                >
                  {cell.props.children}
                  <span aria-hidden="true" className={active ? '' : 'opacity-40'}>
                    {active ? (sort.descending ? '↓' : '↑') : '↕'}
                  </span>
                </button>,
              );
            }),
          );
        }),
      );
    }
    if (section.type !== 'tbody') return section;
    return cloneElement(
      section,
      {},
      (sort
        ? sortTableRows(section.props.children, sort.column, sort.descending)
        : nodes(section.props.children)
      ).map((node) => disableDrag(node, Boolean(sort))),
    );
  });
  return (
    <div className="overflow-x-auto">
      {sort ? (
        <div className="flex justify-end px-2 py-1">
          <button
            type="button"
            onClick={() => setSort(null)}
            className="text-xs text-[var(--color-ink-muted)] underline"
          >
            Reset sort
          </button>
        </div>
      ) : null}
      <table className={className}>{sections}</table>
    </div>
  );
}

function disableDrag(node: ReactNode, disabled: boolean): ReactNode {
  if (!isValidElement<ElementProps>(node)) return node;
  return cloneElement(
    node,
    disabled && node.props.draggable ? { draggable: false } : {},
    nodes(node.props.children).map((child) => disableDrag(child, disabled)),
  );
}

export function sortTableRows(children: ReactNode, column: number, descending: boolean) {
  const rows = nodes(children).map((row, index) => ({ row, index, values: values(row) }));
  const ordered = rows
    .filter((row) => row.values)
    .sort((a, b) => {
      const av = a.values![column] ?? null,
        bv = b.values![column] ?? null;
      const emptyA = av === null || av === '',
        emptyB = bv === null || bv === '';
      if (emptyA !== emptyB) return emptyA ? 1 : -1;
      const result = compareSortValues(av, bv);
      return (descending ? -result : result) || a.index - b.index;
    });
  return [...ordered, ...rows.filter((row) => !row.values)].map((item) => item.row);
}

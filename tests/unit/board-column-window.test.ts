import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RecordWindow } from '@/components/ui/record-window';

type Record = { id: string };
const records = (name: string, count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: `${name}-${index + 1}` }));
const column = (name: string, count: number, revealId?: string) =>
  createElement(RecordWindow<Record>, {
    records: records(name, count),
    resetKey: 'board:all',
    revealId,
    children: (items) =>
      createElement(
        'section',
        { 'aria-label': name },
        items.map((item) => createElement('article', { key: item.id }, item.id)),
      ),
  });

describe('Board column record windows', () => {
  it('shows all five To do and seven In progress cards even when Done has 44 records', () => {
    const markup = renderToStaticMarkup(
      createElement('div', null, column('Done', 44), column('To do', 5), column('In progress', 7)),
    );
    expect(markup.match(/<article>/g)).toHaveLength(22);
    expect(markup).toContain('To do-5');
    expect(markup).toContain('In progress-7');
    expect(markup).toContain('Done-10');
    expect(markup).not.toContain('Done-11');
    expect(markup.match(/Show more<\/button>/g)).toHaveLength(1);
  });

  it('gives every long column ten cards and its own Show more control', () => {
    const markup = renderToStaticMarkup(
      createElement('div', null, column('To do', 25), column('In progress', 17)),
    );
    expect(markup.match(/<article>/g)).toHaveLength(20);
    expect(markup).toContain('Showing 10 of 25');
    expect(markup).toContain('Showing 10 of 17');
    expect(markup.match(/Show more<\/button>/g)).toHaveLength(2);
  });

  it('reveals a created task only inside its own column', () => {
    const markup = renderToStaticMarkup(
      createElement('div', null, column('To do', 25, 'To do-25'), column('Done', 44, 'To do-25')),
    );
    expect(markup).toContain('To do-25');
    expect(markup).toContain('Showing 25 of 25');
    expect(markup).toContain('Showing 10 of 44');
    expect(markup).not.toContain('Done-11');
  });
});

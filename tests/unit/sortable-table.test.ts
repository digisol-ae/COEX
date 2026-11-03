import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SortableTable } from '@/components/ui/sortable-table';

describe('SortableTable', () => {
  it('renders a row that holds form fields and other elements without children', () => {
    // Regression: the drag handling gave every element an empty child list, and React refuses
    // that for <input> and <br>, so the whole page failed to load.
    const markup = renderToStaticMarkup(
      createElement(
        SortableTable,
        null,
        createElement(
          'tbody',
          null,
          createElement(
            'tr',
            null,
            createElement(
              'td',
              null,
              createElement(
                'form',
                null,
                createElement('input', { type: 'hidden', name: 'id', value: '1' }),
                createElement('br'),
              ),
            ),
          ),
        ),
      ),
    );

    expect(markup).toContain('<input type="hidden" name="id" value="1"/>');
  });
  it('renders only 10 of 55 rows and places Show more after the table', () => {
    const markup = renderToStaticMarkup(
      createElement(
        SortableTable,
        null,
        createElement(
          'tbody',
          null,
          Array.from({ length: 55 }, (_, index) =>
            createElement('tr', { key: index }, createElement('td', null, `record-${index}`)),
          ),
        ),
      ),
    );
    expect(markup.match(/<tr>/g) ?? []).toHaveLength(10);
    expect(markup).toContain('record-9');
    expect(markup).not.toContain('record-10');
    expect(markup.indexOf('Show more')).toBeGreaterThan(markup.indexOf('</table>'));
    expect(markup).toContain('Showing 10 of 55');
  });
  it('shares one 10-record budget across multiple table bodies', () => {
    const body = (offset: number) =>
      createElement(
        'tbody',
        { key: offset },
        Array.from({ length: 20 }, (_, index) =>
          createElement('tr', { key: offset + index }, createElement('td', null, offset + index)),
        ),
      );
    const markup = renderToStaticMarkup(createElement(SortableTable, null, body(0), body(20)));
    expect(markup.match(/<tr>/g) ?? []).toHaveLength(10);
  });
});

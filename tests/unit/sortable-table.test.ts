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
});

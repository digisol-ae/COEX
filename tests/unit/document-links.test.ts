import { describe, expect, it } from 'vitest';
import { parseDocumentLink } from '@/modules/tasks/document-links';

/** Pure validation, no database. */

describe('document links', () => {
  it('accepts Microsoft 365 links', () => {
    expect(
      parseDocumentLink('https://digisol.sharepoint.com/sites/ops/Shared%20Documents/plan.docx')
        .url,
    ).toContain('sharepoint.com');

    expect(parseDocumentLink('https://1drv.ms/w/s!abc').url).toContain('1drv.ms');
  });

  it('refuses anything else, so documents stay in Microsoft 365', () => {
    expect(() => parseDocumentLink('https://drive.google.com/file/d/123')).toThrow(
      /Only Microsoft 365 links/,
    );
    expect(() => parseDocumentLink('http://digisol.sharepoint.com/x')).toThrow(/https/);
    expect(() => parseDocumentLink('not a link')).toThrow(/does not look like a link/);
  });

  it('suggests a readable name from the link', () => {
    expect(
      parseDocumentLink('https://digisol.sharepoint.com/sites/ops/Project%20Plan.docx')
        .suggestedTitle,
    ).toBe('Project Plan.docx');
  });
});

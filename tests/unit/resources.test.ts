import { describe, expect, it } from 'vitest';
import {
  shareExpiry,
  documentType,
  safeFileName,
  previewable,
  MAX_RESOURCE_BYTES,
} from '@/modules/resources/rules';
import { documentResponse, boundedBody } from '@/modules/resources/http';
import { permissionsFor } from '@coex/shared/core/permissions';
describe('Customer resources boundaries', () => {
  it('defaults to 72 hours and bounds custom expiry', () => {
    const now = new Date('2026-11-03T00:00:00Z');
    expect(shareExpiry(undefined, now).toISOString()).toBe('2026-11-06T00:00:00.000Z');
    expect(shareExpiry(24, now).toISOString()).toBe('2026-11-04T00:00:00.000Z');
    for (const hours of [0, -1, Infinity, NaN, 8761])
      expect(() => shareExpiry(hours, now)).toThrow();
  });
  it('rejects executable formats, disguised documents and oversized content', () => {
    for (const name of ['guide.html', 'guide.svg', 'guide.exe', 'guide.pdf'])
      expect(() => documentType(name, Buffer.from('<script>alert(1)</script>'))).toThrow();
    expect(() => documentType('large.txt', Buffer.alloc(MAX_RESOURCE_BYTES + 1, 65))).toThrow();
    expect(documentType('guide.pdf', Buffer.from('%PDF-1.4'))).toBe('application/pdf');
    expect(documentType('guide.docx', Buffer.from('PK\x03\x04'))).toContain('wordprocessingml');
    expect(previewable('application/msword')).toBe(false);
  });
  it('forces office downloads and serves safe inline PDF headers without caching', () => {
    const pdf = documentResponse(
      { body: Buffer.from('%PDF'), contentType: 'application/pdf', fileName: 'a.pdf' },
      false,
    );
    expect(pdf.headers.get('content-disposition')).toContain('inline');
    expect(pdf.headers.get('cache-control')).toContain('no-store');
    expect(pdf.headers.get('referrer-policy')).toBe('no-referrer');
    expect(
      documentResponse(
        { body: Buffer.from('PK'), contentType: 'application/msword', fileName: 'bad"\r\n.doc' },
        false,
      ).headers.get('content-disposition'),
    ).toContain('attachment');
    expect(safeFileName('../a\r\n".pdf')).not.toMatch(/[\r\n"/]/);
  });
  it('stops reading uploads above the configured byte limit', async () => {
    const req = new Request('https://example.test', { method: 'POST', body: '123456' });
    await expect(boundedBody(req, 5)).rejects.toThrow('large');
  });
  it('allows staff to share, managers to maintain and no portal account to manage the library', () => {
    expect(permissionsFor({ role: 'agent' }).has('resource.share')).toBe(true);
    expect(permissionsFor({ role: 'agent' }).has('resource.manage')).toBe(false);
    expect(permissionsFor({ role: 'manager' }).has('resource.manage')).toBe(true);
    expect(permissionsFor({ role: 'client_contact' }).has('resource.read')).toBe(false);
  });
});

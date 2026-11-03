import { createHash, createHmac } from 'node:crypto';
export const DEFAULT_SHARE_HOURS = 72;
export const MAX_RESOURCE_BYTES = 20 * 1024 * 1024;
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export function otpDigest(shareId: string, nonce: string, code: string) {
  if (!process.env.AUTH_SECRET) throw new Error('Resource verification is unavailable.');
  return createHmac('sha256', process.env.AUTH_SECRET)
    .update(`resource:${shareId}:${nonce}:${code}`)
    .digest('hex');
}
export function shareExpiry(hours: number = DEFAULT_SHARE_HOURS, now = new Date()) {
  if (!Number.isFinite(hours) || hours < 1 || hours > 8760)
    throw new Error('Choose an expiry between 1 hour and 365 days.');
  return new Date(now.getTime() + hours * 3600000);
}
export function documentType(fileName: string, bytes: Buffer) {
  if (!bytes.length || bytes.length > MAX_RESOURCE_BYTES)
    throw new Error('Choose a document up to 20 MB.');
  const ext = fileName.split('.').pop()?.toLowerCase();
  const zip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  const ole = bytes.subarray(0, 8).equals(Buffer.from('d0cf11e0a1b11ae1', 'hex'));
  const types: Record<string, [string, boolean]> = {
    pdf: ['application/pdf', bytes.subarray(0, 5).toString() === '%PDF-'],
    docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', zip],
    xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', zip],
    pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation', zip],
    doc: ['application/msword', ole],
    xls: ['application/vnd.ms-excel', ole],
    ppt: ['application/vnd.ms-powerpoint', ole],
    txt: ['text/plain; charset=utf-8', !bytes.includes(0)],
    png: ['image/png', bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))],
    jpg: ['image/jpeg', bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255],
    jpeg: ['image/jpeg', bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255],
    webp: [
      'image/webp',
      bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP',
    ],
  };
  const type = types[ext ?? ''];
  if (!type?.[1]) throw new Error('Use a valid PDF, Word, Excel, PowerPoint, text or image file.');
  return type[0];
}
export const previewable = (type: string) =>
  type === 'application/pdf' || type.startsWith('image/') || type.startsWith('text/plain');
export const safeFileName = (name: string) =>
  name.replace(/[\x00-\x1f\x7f-\uffff"\\/]/g, '_').slice(0, 180) || 'document';

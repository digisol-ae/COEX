import { previewable, safeFileName } from './rules';
export const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};
export async function boundedBody(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('No content received.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new Error('Upload is too large. Documents may be up to 20 MB.');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export function documentResponse(
  file: { body: Buffer; fileName: string; contentType: string },
  download: boolean,
) {
  const inline = !download && previewable(file.contentType);
  return new Response(new Uint8Array(file.body), {
    headers: {
      ...PRIVATE_HEADERS,
      'Content-Type': file.contentType,
      'Content-Length': String(file.body.length),
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${safeFileName(file.fileName)}"`,
      // A sandboxed response disables browser PDF viewers. Only validated PDF, raster images
      // and plain text are ever inline; office documents are forced to download.
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'self'",
    },
  });
}
export const resourceCookie = (id: string) => `resource_access_${id}`;

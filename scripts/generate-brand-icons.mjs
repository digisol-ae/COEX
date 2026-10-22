import { copyFile, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

// Keep browser and Apple icons derived from the same vector as the app's brand mark.
const source = new URL('../apps/web/public/brand/coex-monogram.svg', import.meta.url);
const app = new URL('../apps/web/src/app/', import.meta.url);
await copyFile(source, new URL('icon.svg', app));
await sharp(source.pathname).resize(180, 180).png().toFile(new URL('apple-icon.png', app).pathname);

// ICO supports PNG-compressed entries; include three sizes for older browser/tab consumers.
const sizes = [16, 32, 48];
const images = await Promise.all(
  sizes.map((size) => sharp(source.pathname).resize(size, size).png().toBuffer()),
);
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((size, index) => {
  const entry = 6 + index * 16;
  header[entry] = size;
  header[entry + 1] = size;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(images[index].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += images[index].length;
});
await writeFile(new URL('favicon.ico', app), Buffer.concat([header, ...images]));
console.log('Generated icon.svg, apple-icon.png (180px), favicon.ico (16/32/48px).');

// Keep transparent high-density UI artwork separate from browser icons. At the smallest
// sidebar size, the 1496px-wide master supplies more than 8 source pixels per CSS pixel.
const brand = new URL('../apps/web/public/brand/', import.meta.url);
const wordmark = await readFile(new URL('coex-logo.svg', brand), 'utf8');
const css = await readFile(new URL('../apps/web/src/app/globals.css', import.meta.url), 'utf8');
const coral = css.match(/--color-brand-red:\s*(#[a-f\d]{6})/i)?.[1];
if (!coral) throw new Error('Cannot find the COEX brand colour.');
const letters = wordmark.replace(/<\/g>[\s\S]*<\/svg>/, '</g></svg>').replace(/#EE3E51/gi, coral);
await sharp(Buffer.from(letters))
  .resize(1496, 328)
  .png({ compressionLevel: 9 })
  .toFile(new URL('coex-wordmark-hires.png', brand).pathname);
await sharp(source.pathname)
  .resize(512, 512)
  .png({ compressionLevel: 9 })
  .toFile(new URL('coex-monogram-hires.png', brand).pathname);
console.log('Generated high-density transparent wordmark and monogram PNGs for UI rendering.');

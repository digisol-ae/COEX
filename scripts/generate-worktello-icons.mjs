import { readFile, writeFile, copyFile } from 'node:fs/promises';
import sharp from 'sharp';

// The approved master is raster artwork. SVG exports embed it; they are not traced vectors.
const brand = new URL('../apps/web/public/brand/', import.meta.url);
const app = new URL('../apps/web/src/app/', import.meta.url);
const symbol = (await readFile(new URL('worktello-symbol.png', brand))).toString('base64');
const lettering = (await readFile(new URL('worktello-lettering.png', brand))).toString('base64');
const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 300" role="img" aria-label="Worktello"><title>Worktello</title><image href="data:image/png;base64,${symbol}" x="0" y="0" width="560" height="300"/><image href="data:image/png;base64,${lettering}" x="600" y="0" width="1320" height="300"/></svg>`;
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Worktello"><title>Worktello</title><rect width="512" height="512" rx="112" fill="#0B203E"/><image href="data:image/png;base64,${symbol}" x="52" y="125" width="408" height="262"/></svg>`;
await writeFile(new URL('worktello-logo.svg', brand), logo);
await writeFile(new URL('worktello-monogram.svg', brand), icon);
await copyFile(new URL('worktello-monogram.svg', brand), new URL('icon.svg', app));
await sharp(Buffer.from(logo))
  .resize(1920, 300)
  .png()
  .toFile(new URL('worktello-wordmark.png', brand).pathname);
await sharp(Buffer.from(icon))
  .resize(512, 512)
  .png()
  .toFile(new URL('worktello-app-icon.png', brand).pathname);
await sharp(Buffer.from(icon))
  .resize(180, 180)
  .png()
  .toFile(new URL('apple-icon.png', app).pathname);
const sizes = [16, 32, 48];
const images = await Promise.all(
  sizes.map((size) => sharp(Buffer.from(icon)).resize(size, size).png().toBuffer()),
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
console.log(
  'Generated Worktello wordmark, app icon, browser SVG, Apple icon and three-size favicon.',
);

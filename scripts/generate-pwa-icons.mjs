import sharp from 'sharp';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const brand = path.join(root, 'apps/web/public/brand');
const source = path.join(brand, 'worktello-app-icon.png');
const background = '#0c213d';

for (const size of [192, 512]) {
  await sharp(source)
    .flatten({ background })
    .resize(size, size)
    .png()
    .toFile(path.join(brand, `pwa-${size}.png`));
}
await sharp(source)
  .flatten({ background })
  .resize(180, 180)
  .png()
  .toFile(path.join(root, 'apps/web/src/app/apple-icon.png'));
// Keep all artwork within the central safe circle when the OS crops this icon.
const inset = await sharp(source).flatten({ background }).resize(352, 352).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 3, background } })
  .composite([{ input: inset, gravity: 'centre' }])
  .removeAlpha()
  .png()
  .toFile(path.join(brand, 'pwa-maskable-512.png'));

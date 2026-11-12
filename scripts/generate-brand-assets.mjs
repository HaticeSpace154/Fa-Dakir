import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import sharp from 'sharp';

const root = process.cwd();
const assets = path.join(root, 'assets');
const publicIcons = path.join(root, 'public', 'icons');
const branding = path.join(root, 'public', 'branding');
await Promise.all([mkdir(publicIcons, { recursive: true }), mkdir(branding, { recursive: true })]);

const jfifLogo = await readFile(path.join(assets, 'brand-logo.jfif'));

const background = await sharp({ create: { width: 1024, height: 1024, channels: 3, background: '#071a33' } }).png().toBuffer();
const icon = await sharp(jfifLogo).resize(1024, 1024, { fit: 'cover', position: 'centre' }).png().toBuffer();
const foreground = icon;
const splash = await sharp(jfifLogo).resize(2732, 2732, { fit: 'cover', position: 'centre' }).png().toBuffer();

await Promise.all([
  writeFile(path.join(assets, 'icon-only.png'), icon),
  writeFile(path.join(assets, 'logo.png'), icon),
  writeFile(path.join(assets, 'icon-background.png'), background),
  writeFile(path.join(assets, 'icon-foreground.png'), foreground),
  writeFile(path.join(assets, 'splash.png'), splash),
  copyFile(path.join(assets, 'brand-logo.jfif'), path.join(branding, 'logo.jfif')),
  writeFile(path.join(assets, 'logo.svg'), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1408 768"><image href="brand-logo.jfif" width="1408" height="768"/></svg>')),
  writeFile(path.join(branding, 'logo-mark.svg'), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1408 768"><image href="logo.jfif" width="1408" height="768"/></svg>')),
]);

for (const size of [48, 72, 96, 128, 192, 256, 512]) {
  await sharp(icon).resize(size, size).webp({ quality: 88 }).toFile(path.join(publicIcons, `icon-${size}.webp`));
}

// Keep Android's density-specific launch and adaptive icon resources in sync.
const androidRes = path.join(root, 'android', 'app', 'src', 'main', 'res');
for (const folder of await readdir(androidRes, { withFileTypes: true })) {
  if (!folder.isDirectory()) continue;
  const dir = path.join(androidRes, folder.name);
  if (folder.name.startsWith('mipmap-')) {
    for (const [file, source] of [
      ['ic_launcher.png', icon],
      ['ic_launcher_round.png', icon],
      ['ic_launcher_foreground.png', foreground],
      ['ic_launcher_background.png', background],
    ]) {
      const target = path.join(dir, file);
      if (!existsSync(target)) continue;
      try {
        const meta = await sharp(target).metadata();
        await sharp(source).resize(meta.width, meta.height, { fit: 'contain' }).png().toFile(`${target}.new`);
        const { rename } = await import('node:fs/promises');
        await rename(`${target}.new`, target);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  }
  if (folder.name.startsWith('drawable-') || folder.name === 'drawable') {
    const target = path.join(dir, 'splash.png');
    if (!existsSync(target)) continue;
    try {
      const meta = await sharp(target).metadata();
      await sharp(splash).resize(meta.width, meta.height, { fit: 'cover', position: 'centre' }).png().toFile(`${target}.new`);
      const { rename } = await import('node:fs/promises');
      await rename(`${target}.new`, target);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}
const androidSplash = path.join(androidRes, 'splash.png');
try {
  const meta = await sharp(androidSplash).metadata();
  await sharp(splash).resize(meta.width, meta.height, { fit: 'cover', position: 'centre' }).png().toFile(`${androidSplash}.new`);
  const { rename } = await import('node:fs/promises');
  await rename(`${androidSplash}.new`, androidSplash);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

console.log('Generated Fa-Dakir logo, PWA icons, and Android splash resources.');

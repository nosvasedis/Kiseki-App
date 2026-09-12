import sharp from 'sharp';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
const base = 'public/assets/kiseki';
const out = `${base}/runtime`;
const night = '#070f23';
await mkdir(out, { recursive: true });
const licenses = await Promise.all(
  ['eb-garamond', 'alegreya-sans', 'shippori-mincho', 'zen-kaku-gothic-new'].map(
    async (font) =>
      `${font}\n${await readFile(`node_modules/@fontsource/${font}/LICENSE`, 'utf8')}`,
  ),
);
await writeFile(`${out}/FONT-LICENSES.txt`, licenses.join('\n\n'));
const masterPath = `${base}/brand/kiseki-app-icon-master.png`;
let master;
try {
  await access(masterPath);
  master = sharp(masterPath);
} catch {
  const logo = await sharp(`${base}/brand/kiseki-logo.svg`)
    .resize(744, 744, { fit: 'contain', background: { r: 7, g: 15, b: 35, alpha: 0 } })
    .png()
    .toBuffer();
  master = sharp({
    create: { width: 1024, height: 1024, channels: 4, background: night },
  }).composite([{ input: logo, left: 140, top: 140 }]);
}
const masterPng = await master.png().toBuffer();
for (const size of [192, 512, 180])
  await sharp(masterPng)
    .resize(size, size)
    .png()
    .toFile(`${out}/${size === 180 ? 'apple-touch-icon' : `icon-${size}`}.png`);
await sharp(masterPng)
  .resize(360, 360)
  .extend({ top: 76, bottom: 76, left: 76, right: 76, background: night })
  .png()
  .toFile(`${out}/maskable-512.png`);
const texturePath = `${base}/textures/kiseki-midnight-washi-texture.png`;
try {
  await access(texturePath);
  await sharp(texturePath).resize(800, 800).webp({ quality: 74 }).toFile(`${out}/washi.webp`);
} catch {
  await sharp(`${out}/washi.svg`).resize(800, 800).webp({ quality: 74 }).toFile(`${out}/washi.webp`);
}
await writeFile(
  `${out}/README.md`,
  '# Runtime assets\n\nGenerated with `node scripts/assets.mjs`. Original PNGs are retained unchanged when present. Icons are resized from the approved master, or from the SVG logo on a Kyoto Night field when the master is absent. The maskable variant keeps the central artwork within its safe area. Washi is compressed for offline caching. Jar and star graphics are intentionally code-native in JarCanvas.tsx and physics.ts, with real transparency and shared collision geometry.\n',
);

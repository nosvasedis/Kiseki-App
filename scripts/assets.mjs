import sharp from 'sharp';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const base = 'public/assets/kiseki';
const out = `${base}/runtime`;
await mkdir(out, { recursive: true });
const licenses = await Promise.all(
  ['eb-garamond', 'alegreya-sans', 'shippori-mincho', 'zen-kaku-gothic-new'].map(
    async (font) =>
      `${font}\n${await readFile(`node_modules/@fontsource/${font}/LICENSE`, 'utf8')}`,
  ),
);
await writeFile(`${out}/FONT-LICENSES.txt`, licenses.join('\n\n'));
for (const size of [192, 512, 180])
  await sharp(`${base}/brand/kiseki-app-icon-master.png`)
    .resize(size, size)
    .png()
    .toFile(`${out}/${size === 180 ? 'apple-touch-icon' : `icon-${size}`}.png`);
await sharp(`${base}/brand/kiseki-app-icon-master.png`)
  .resize(360, 360)
  .extend({ top: 76, bottom: 76, left: 76, right: 76, background: '#070f23' })
  .png()
  .toFile(`${out}/maskable-512.png`);
await sharp(`${base}/textures/kiseki-midnight-washi-texture.png`)
  .resize(800, 800)
  .webp({ quality: 74 })
  .toFile(`${out}/washi.webp`);
await writeFile(
  `${out}/README.md`,
  '# Runtime assets\n\nGenerated with `node scripts/assets.mjs`. Original PNGs are retained unchanged. Icons are resized from the approved master; the maskable variant keeps the central artwork within its safe area. Washi is compressed for offline caching. Jar and star graphics are intentionally code-native in JarCanvas.tsx and physics.ts, with real transparency and shared collision geometry.\n',
);

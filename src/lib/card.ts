import { drawStar } from './physics';
import { PALETTE, graphemes, summarizeMonth, type Star, type Language } from './models';
import { dictionaries, locale } from './i18n';
function seed(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}
function placeMonthKisekis(kisekis: Star[], cy: number, spread: number) {
  const n = kisekis.length;
  return kisekis.map((star, i) => {
    const h = seed(star.id);
    const t = n === 1 ? 0.5 : i / (n - 1);
    const angle = -Math.PI * 0.95 + t * Math.PI * 1.9 + ((h % 17) - 8) / 70;
    const ring = 0.38 + (h % 5) * 0.11;
    return {
      star,
      x: 540 + Math.cos(angle) * spread * ring,
      y: cy + Math.sin(angle) * spread * ring * 0.58 + ((h >> 8) % 36) - 18,
      r: n < 6 ? 36 : n < 14 ? 24 : n < 28 ? 16 : 12,
      angle: ((h >> 4) % 50) / 18,
    };
  });
}
export async function renderCard(
  canvas: HTMLCanvasElement,
  stars: Star[],
  key: string,
  language: Language,
  includeText: boolean,
) {
  const summary = summarizeMonth(stars, key);
  const fontText =
    summary.memories.map((s) => s.text).join('') +
    Object.values(dictionaries[language]).join('') +
    'Kiseki';
  await Promise.all(
    ['EB Garamond', 'Alegreya Sans', 'Shippori Mincho', 'Zen Kaku Gothic New'].map((font) =>
      document.fonts.load(`29px "${font}"`, fontText),
    ),
  );
  await document.fonts.ready;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('NO_CANVAS');
  canvas.width = 1080;
  canvas.height = 1920;
  const t = dictionaries[language];
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
  gradient.addColorStop(0, '#142542');
  gradient.addColorStop(0.55, '#0D1833');
  gradient.addColorStop(1, '#070F23');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);
  // Deterministic, native decorative layer: no private text baked into source assets.
  for (let i = 0; i < 80; i++) {
    const x = (i * 337 + 59) % 1080,
      y = (i * 197 + 31) % 1920;
    ctx.fillStyle = Object.values(PALETTE)[i % 14] + (i % 3 ? '44' : '77');
    ctx.beginPath();
    ctx.arc(x, y, i % 3 ? 1.2 : 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#e7b86655';
  ctx.lineWidth = 1;
  ctx.strokeRect(40, 40, 1000, 1840);
  ctx.fillStyle = '#E7B866';
  ctx.beginPath();
  ctx.arc(540, 130, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#142542';
  ctx.beginPath();
  ctx.arc(552, 117, 30, 0, Math.PI * 2);
  ctx.fill();
  const sans = '"Alegreya Sans", "Zen Kaku Gothic New", sans-serif',
    serif = '"EB Garamond", "Shippori Mincho", serif';
  const text = (value: string, y: number, size = 30, color = '#F7F1DF', font = sans) => {
    ctx.font = `${size}px ${font}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(value, 540, y, 880);
  };
  text('Kiseki', 235, 62, '#F7F1DF', serif);
  const [year, month] = key.split('-').map(Number);
  text(
    new Date(year, month - 1, 1).toLocaleDateString(locale(language), {
      month: 'long',
      year: 'numeric',
    }),
    320,
    32,
    '#C8C8D1',
  );
  text(String(summary.total), 510, 130, '#E7B866', serif);
  text(t.wins, 566, 30);
  if (summary.dominant) {
    text(t.path, 657, 25, '#C8C8D1');
    text(t[summary.dominant], 706, 40, '#F7F1DF', serif);
  }
  if (summary.hour !== null)
    text(`${t.hour} · ${String(summary.hour).padStart(2, '0')}:00`, 768, 24, '#C8C8D1');
  const withQuotes = includeText && summary.memories.length > 0;
  if (summary.kisekis.length) {
    if (withQuotes) {
      summary.kisekis.forEach((star, i) => {
        const x = 120 + (i % 16) * 53;
        const y = 818 + Math.floor(i / 16) * 34;
        drawStar(ctx, x, y, 11, PALETTE[star.colorId], seed(star.id) / 200, star.category);
      });
    } else {
      const placed = placeMonthKisekis(summary.kisekis, 1280, 400);
      ctx.strokeStyle = '#E7B86633';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      placed.forEach(({ x, y }, i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      placed.forEach(({ star, x, y, r, angle }) =>
        drawStar(ctx, x, y, r, PALETTE[star.colorId], angle, star.category),
      );
    }
  }
  if (withQuotes) {
    text(t.moments, 910, 28, '#E7B866');
    summary.memories.forEach((memory, index) => {
      let size = 29,
        lines: string[] = [];
      do {
        ctx.font = `${size}px ${sans}`;
        lines = [];
        let line = '';
        for (const char of graphemes(memory.text.replace(/\s+/g, ' '))) {
          if (ctx.measureText(line + char).width > 820 && line) {
            const space = line.lastIndexOf(' ');
            if (space > line.length * 0.4) {
              lines.push(line.slice(0, space));
              line = line.slice(space + 1) + char;
            } else {
              lines.push(line);
              line = char;
            }
          } else line += char;
        }
        if (line) lines.push(line);
        if (lines.length * (size + 9) > 194) size--;
      } while (lines.length * (size + 9) > 194 && size > 15);
      const top = 980 + index * 240;
      drawStar(ctx, 540, top - 20, 14, PALETTE[memory.colorId], 0, memory.category);
      lines.forEach((line, i) => text(line, top + 27 + i * (size + 9), size));
    });
  }
  ctx.strokeStyle = '#E7B86666';
  ctx.beginPath();
  ctx.moveTo(390, 1770);
  ctx.lineTo(690, 1770);
  ctx.stroke();
  text(t.wrappedFooter, 1830, 27, '#C8C8D1', serif);
  return summary;
}
export function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('EXPORT_FAILED'))),
      'image/png',
    ),
  );
}
export { CATEGORIES } from './models';

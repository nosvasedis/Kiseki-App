export function clipPolygon(points: ReadonlyArray<readonly [number, number]>) {
  return `polygon(${points.map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`).join(', ')})`;
}
export function rectPoints(count: number): [number, number][] {
  const n = Math.max(6, count);
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * 4;
    if (t < 1) return [4 + t * 92, 4];
    if (t < 2) return [96, 4 + (t - 1) * 92];
    if (t < 3) return [96 - (t - 2) * 92, 96];
    return [4, 96 - (t - 3) * 92];
  });
}
export function ringPoints(count: number, radius: number): [number, number][] {
  return Array.from({ length: count }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    return [50 + Math.cos(a) * radius, 50 + Math.sin(a) * radius];
  });
}
export function starPoints(tips: number, inner: number, outer = 48): [number, number][] {
  return Array.from({ length: tips * 2 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / tips;
    const r = i % 2 ? inner : outer;
    return [50 + Math.cos(a) * r, 50 + Math.sin(a) * r];
  });
}
export function foldClips(tips: number) {
  const n = tips * 2;
  return {
    sheet: clipPolygon(rectPoints(n)),
    cushion: clipPolygon(ringPoints(n, 46)),
    kite: clipPolygon(starPoints(tips, 26, 47)),
    star: clipPolygon(starPoints(tips, 18, 48)),
  };
}

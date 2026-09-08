import { useEffect, useRef } from 'react';
import { drawStar } from '../lib/physics';
import { PALETTE, type Star } from '../lib/models';

type FigureStar = Pick<Star, 'colorId' | 'category'> & { isFavorite?: boolean };

export const STAR_FIGURE_PAD = 3.6;
export const FOLD_STAR_PAD = 2.2;
export const REVEAL_STAR_SIZE = 96;

export function StarFigure({
  star,
  size = 128,
  angle = 0,
  lit = true,
  pad = STAR_FIGURE_PAD,
  className,
}: {
  star: FigureStar;
  size?: number;
  angle?: number;
  lit?: boolean;
  pad?: number;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    const paint = (time: number) => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const box = size * pad;
      const w = Math.ceil(box * dpr);
      if (el.width !== w) {
        el.width = w;
        el.height = w;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, box, box);
      const loved = Boolean(star.isFavorite);
      const beat = lit || loved ? Math.sin(time / 380) : 0;
      drawStar(
        ctx,
        box / 2,
        box / 2,
        size * 0.5,
        PALETTE[star.colorId],
        angle,
        star.category,
        lit,
        loved,
        beat,
      );
      raf = requestAnimationFrame(paint);
    };
    paint(performance.now());
    return () => cancelAnimationFrame(raf);
  }, [star, size, angle, lit, pad]);
  const box = size * pad;
  return (
    <canvas
      ref={canvas}
      className={className}
      aria-hidden="true"
      style={{ width: box, height: box }}
    />
  );
}

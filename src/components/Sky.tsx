import { useEffect, useState } from 'react';
import { COLORS, PALETTE } from '../lib/models';
const STARS = Array.from({ length: 210 }, (_, i) => ({
  left: ((i * 149 + 17) % 1000) / 10,
  top: ((i * 83 + 29) % 1000) / 10,
  size: 1.15 + (i % 6) * 0.55,
  color: COLORS[i % COLORS.length],
  delay: (i % 17) * 0.38,
  duration: 4.8 + (i % 9) * 0.55,
  kind: i % 19 === 0 ? 'bright' : i % 7 === 0 ? 'dim' : 'soft',
}));
const GEMS = [
  { left: 7, top: 11, size: 3.4, color: 'gold' as const },
  { left: 18, top: 6, size: 2.6, color: 'sakura' as const },
  { left: 31, top: 14, size: 2.8, color: 'ice' as const },
  { left: 48, top: 5, size: 3.1, color: 'moon' as const },
  { left: 63, top: 9, size: 2.5, color: 'lavender' as const },
  { left: 79, top: 7, size: 3.2, color: 'aurora' as const },
  { left: 93, top: 16, size: 2.7, color: 'peach' as const },
  { left: 4, top: 38, size: 2.9, color: 'violet' as const },
  { left: 96, top: 42, size: 3, color: 'jade' as const },
  { left: 11, top: 58, size: 2.4, color: 'ember' as const },
  { left: 88, top: 62, size: 2.8, color: 'sea' as const },
  { left: 6, top: 78, size: 3, color: 'amber' as const },
  { left: 27, top: 84, size: 2.5, color: 'blush' as const },
  { left: 72, top: 81, size: 3.1, color: 'gold' as const },
  { left: 91, top: 88, size: 2.6, color: 'ice' as const },
  { left: 54, top: 91, size: 2.3, color: 'mist' as const },
];
const CONSTELLATIONS = [
  {
    left: '5%',
    top: '7%',
    width: 88,
    rotate: -8,
    d: 'M4 8 L12 18 L22 10 L32 22 L42 14',
    stars: [
      [4, 8],
      [12, 18],
      [22, 10],
      [32, 22],
      [42, 14],
    ],
  },
  {
    left: '78%',
    top: '9%',
    width: 68,
    rotate: 10,
    d: 'M8 6 L18 16 L28 8 L22 24',
    stars: [
      [8, 6],
      [18, 16],
      [28, 8],
      [22, 24],
    ],
  },
  {
    left: '88%',
    top: '36%',
    width: 52,
    rotate: -14,
    d: 'M8 6 L24 10 L12 24 Z',
    stars: [
      [8, 6],
      [24, 10],
      [12, 24],
    ],
  },
  {
    left: '4%',
    top: '40%',
    width: 60,
    rotate: 6,
    d: 'M14 4 L24 14 L14 26 L4 14 Z M14 26 L14 34',
    stars: [
      [14, 4],
      [24, 14],
      [14, 26],
      [4, 14],
      [14, 34],
    ],
  },
  {
    left: '72%',
    top: '74%',
    width: 78,
    rotate: -6,
    d: 'M4 18 L14 8 L24 6 L34 10 L44 20',
    stars: [
      [4, 18],
      [14, 8],
      [24, 6],
      [34, 10],
      [44, 20],
    ],
  },
  {
    left: '7%',
    top: '76%',
    width: 50,
    rotate: 18,
    d: 'M12 4 L12 28 M4 16 L22 16',
    stars: [
      [12, 4],
      [12, 16],
      [12, 28],
      [4, 16],
      [22, 16],
    ],
  },
  {
    left: '46%',
    top: '5%',
    width: 48,
    rotate: 4,
    d: 'M6 6 L6 22 L16 28 L24 22',
    stars: [
      [6, 6],
      [6, 22],
      [16, 28],
      [24, 22],
    ],
  },
] as const;
export function Sky({ reduced = false }: { reduced?: boolean }) {
  const [shoot, setShoot] = useState<{ id: number; top: number; tilt: number } | null>(null);
  useEffect(() => {
    if (reduced) return;
    let timer = 0;
    let id = 0;
    const tick = () => {
      timer = window.setTimeout(
        () => {
          setShoot({ id: ++id, top: 6 + Math.random() * 32, tilt: -16 - Math.random() * 12 });
          tick();
        },
        14000 + Math.random() * 16000,
      );
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [reduced]);
  return (
    <div className="sky" aria-hidden="true">
      <div className="sky-wash" />
      <div className="sky-veil" />
      <div className="sky-constellations">
        {CONSTELLATIONS.map((item) => (
          <svg
            key={item.d}
            className="sky-constellation"
            viewBox="0 0 48 36"
            style={{
              left: item.left,
              top: item.top,
              width: item.width,
              transform: `rotate(${item.rotate}deg)`,
            }}
          >
            <path d={item.d} className="sky-line" />
            {item.stars.map(([x, y]) => (
              <circle key={`${item.d}-${x}-${y}`} cx={x} cy={y} r={0.55} />
            ))}
          </svg>
        ))}
      </div>
      <div className="starfield">
        {STARS.map((dot, i) => (
          <span
            key={i}
            className={`dust-star is-${dot.kind}`}
            style={{
              left: `${dot.left}%`,
              top: `${dot.top}%`,
              width: dot.size,
              height: dot.size,
              color: PALETTE[dot.color],
              animationDelay: `${dot.delay}s`,
              animationDuration: `${dot.duration}s`,
            }}
          />
        ))}
        {GEMS.map((gem) => (
          <span
            key={`${gem.left}-${gem.top}`}
            className="dust-star is-gem"
            style={{
              left: `${gem.left}%`,
              top: `${gem.top}%`,
              width: gem.size,
              height: gem.size,
              color: PALETTE[gem.color],
              animationDelay: `${gem.left / 20}s`,
              animationDuration: '7.2s',
            }}
          />
        ))}
      </div>
      {shoot && !reduced ? (
        <span
          key={shoot.id}
          className="shooting-star"
          style={{ top: `${shoot.top}%`, ['--tilt' as string]: `${shoot.tilt}deg` }}
        />
      ) : null}
    </div>
  );
}

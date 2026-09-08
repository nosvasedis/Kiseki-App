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
    d: 'M7 10 L15 14 L23 9 L31 16 L38 13 L33 22 L24 20',
    stars: [
      [7, 10, 'gold'],
      [15, 14, 'moon'],
      [23, 9, 'ice'],
      [31, 16, 'sakura'],
      [38, 13, 'amber'],
      [33, 22, 'peach'],
      [24, 20, 'lavender'],
    ],
  },
  {
    d: 'M46 6 L52 13 L59 7 L66 14 L73 6',
    stars: [
      [46, 6, 'violet'],
      [52, 13, 'ice'],
      [59, 7, 'moon'],
      [66, 14, 'aurora'],
      [73, 6, 'gold'],
    ],
  },
  {
    d: 'M82 11 L90 8 L96 16 L89 22 L94 30 L84 26',
    stars: [
      [82, 11, 'jade'],
      [90, 8, 'gold'],
      [96, 16, 'sea'],
      [89, 22, 'blush'],
      [94, 30, 'ice'],
      [84, 26, 'amber'],
    ],
  },
  {
    d: 'M5 34 L12 40 L9 49 L18 54 L14 62',
    stars: [
      [5, 34, 'lavender'],
      [12, 40, 'sakura'],
      [9, 49, 'ember'],
      [18, 54, 'peach'],
      [14, 62, 'gold'],
    ],
  },
  {
    d: 'M70 38 L80 34 L88 42 L80 50 L70 46 L70 38',
    stars: [
      [70, 38, 'aurora'],
      [80, 34, 'ice'],
      [88, 42, 'jade'],
      [80, 50, 'mist'],
      [70, 46, 'sea'],
    ],
  },
  {
    d: 'M24 68 L32 64 L41 70 L49 65 L56 72',
    stars: [
      [24, 68, 'moon'],
      [32, 64, 'gold'],
      [41, 70, 'sakura'],
      [49, 65, 'violet'],
      [56, 72, 'amber'],
    ],
  },
  {
    d: 'M78 64 L86 60 L93 68 L87 76 L78 72 L78 64',
    stars: [
      [78, 64, 'blush'],
      [86, 60, 'peach'],
      [93, 68, 'ember'],
      [87, 76, 'gold'],
      [78, 72, 'lavender'],
    ],
  },
  {
    d: 'M42 28 L48 34 L44 42 L54 40',
    stars: [
      [42, 28, 'ice'],
      [48, 34, 'moon'],
      [44, 42, 'jade'],
      [54, 40, 'aurora'],
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
      <svg className="sky-constellations" viewBox="0 0 100 80" preserveAspectRatio="none">
        {CONSTELLATIONS.map((item) => (
          <g key={item.d}>
            <path d={item.d} className="sky-line" />
            {item.stars.map(([x, y, color]) => (
              <circle
                key={`${item.d}-${x}-${y}`}
                cx={x}
                cy={y}
                r={color === 'gold' || color === 'moon' ? 0.85 : 0.62}
                fill={PALETTE[color]}
              />
            ))}
          </g>
        ))}
      </svg>
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

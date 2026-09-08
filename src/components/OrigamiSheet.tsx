import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { CATEGORY_TRAITS, PALETTE, starScale, type Category, type Color } from '../lib/models';
import { foldClips, starPoints } from '../lib/origami';
import { fairytale } from '../lib/fx';
import { StarFigure, FOLD_STAR_PAD } from './StarFigure';
const FLAPS = ['tl', 'tr', 'br', 'bl', 'n', 'e', 's', 'w'] as const;
export function OrigamiSheet({
  color,
  category,
  text,
  onComplete,
}: {
  color: Color;
  category: Category;
  text: string;
  onComplete: (origin: { x: number; y: number; size: number }) => void;
}) {
  const packet = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const tips = CATEGORY_TRAITS[category].tips;
  const clips = foldClips(tips);
  const facets = starPoints(tips, 18, 48);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    const canvas = packet.current?.querySelector('canvas');
    const box = canvas?.getBoundingClientRect() ?? packet.current?.getBoundingClientRect();
    onCompleteRef.current({
      x: (box?.left ?? innerWidth / 2) + (box?.width ?? 88) / 2,
      y: (box?.top ?? innerHeight / 2) + (box?.height ?? 88) / 2,
      size: Math.max(24, box?.width ?? 72),
    });
  };
  useEffect(() => {
    const timer = window.setTimeout(finish, 1180);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <motion.div
      ref={packet}
      className="origami-sheet"
      style={{ ['--fold' as string]: PALETTE[color], transformPerspective: 1400 }}
      initial={{
        scale: 1,
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
        clipPath: clips.sheet,
        borderRadius: 28,
      }}
      animate={{
        scale: [1, 0.96, 0.72, 0.4, 0.11 + starScale(text) * 0.16],
        rotateX: [0, 22, 12, 4, 0],
        rotateY: [0, -14, 12, 5, 0],
        rotateZ: [0, -8, 6, 16, 12],
        clipPath: [clips.sheet, clips.sheet, clips.cushion, clips.kite, clips.star],
        borderRadius: [28, 22, 12, 0, 0],
      }}
      transition={{ duration: 1.05, times: [0, 0.28, 0.5, 0.74, 1], ease: fairytale }}
      onAnimationComplete={finish}
    >
      <div className="origami-paper" />
      <svg className="origami-creases" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M4 4 L96 96 M96 4 L4 96 M50 4 L50 96 M4 50 L96 50 M20 4 L80 96 M80 4 L20 96 M4 20 L96 80 M4 80 L96 20" />
        <path d="M50 8 L88 38 L74 88 L26 88 L12 38 Z" />
      </svg>
      <svg className="origami-facets" viewBox="0 0 100 100" aria-hidden="true">
        {facets.map((point, i) => {
          const next = facets[(i + 1) % facets.length];
          return (
            <polygon
              key={`${point[0]}-${point[1]}-${i}`}
              points={`50,50 ${point[0]},${point[1]} ${next[0]},${next[1]}`}
              fill={i % 2 ? PALETTE[color] : '#fff8ec'}
              fillOpacity={i % 2 ? 0.94 : 0.38}
              stroke="#fff8ec66"
              strokeWidth="0.32"
            />
          );
        })}
      </svg>
      {FLAPS.map((side, i) => (
        <span key={side} className={`origami-flap is-${side}`} style={{ animationDelay: `${80 + i * 42}ms` }} />
      ))}
      <motion.div
        className="origami-star"
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.58, duration: 0.32, ease: fairytale }}
      >
        <StarFigure
          star={{ colorId: color, category, isFavorite: false }}
          size={88}
          pad={FOLD_STAR_PAD}
          lit
        />
      </motion.div>
    </motion.div>
  );
}

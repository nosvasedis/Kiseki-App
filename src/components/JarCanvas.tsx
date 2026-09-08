import { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { JarWorld, JAR_PATH, hitTest, paintStars } from '../lib/physics';
import { COLORS, type Star } from '../lib/models';
import { chime } from '../lib/sensory';
interface Props {
  stars: Star[];
  jarId: string;
  reduced: boolean;
  paused: boolean;
  shake: number;
  freshId: string | null;
  volume: number;
  label: string;
  hiddenId?: string | null;
  onPick?: (star: Star, origin: { x: number; y: number }) => void;
}
export function JarCanvas({
  stars,
  jarId,
  reduced,
  paused,
  shake,
  freshId,
  volume,
  label,
  hiddenId,
  onPick,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<JarWorld | null>(null);
  const wake = useRef<() => void>(() => {});
  const latest = useRef({ stars, reduced, paused, freshId, volume, hiddenId, onPick });
  useEffect(() => {
    latest.current = { stars, reduced, paused, freshId, volume, hiddenId, onPick };
    wake.current();
  }, [stars, reduced, paused, freshId, volume, hiddenId, onPick]);
  useEffect(() => {
    const el = canvas.current!;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    const w = new JarWorld();
    world.current = w;
    let raf = 0,
      last = 0,
      accumulator = 0,
      idle = 0,
      nextSpawn = 0,
      activeTime = 0;
    const played = new Map<string, number>();
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      el.width = 400 * dpr;
      el.height = 420 * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint();
    };
    const paint = () =>
      paintStars(
        ctx,
        [...w.bodies.values()],
        new Map(latest.current.stars.map((s) => [s.id, s])),
        latest.current.hiddenId ? new Set([latest.current.hiddenId]) : undefined,
      );
    const collisions = (event: Matter.IEventCollision<Matter.Engine>) => {
      const now = performance.now();
      for (const pair of event.pairs) {
        for (const b of [pair.bodyA, pair.bodyB]) {
          if (b.label !== latest.current.freshId || now - (played.get(b.label) ?? -Infinity) < 150)
            continue;
          if (
            Math.hypot(
              pair.bodyA.velocity.x - pair.bodyB.velocity.x,
              pair.bodyA.velocity.y - pair.bodyB.velocity.y,
            ) < 2
          )
            continue;
          const star = latest.current.stars.find((s) => s.id === b.label);
          if (star) {
            played.set(b.label, now);
            chime(COLORS.indexOf(star.colorId), latest.current.volume);
          }
        }
      }
    };
    Matter.Events.on(w.engine, 'collisionStart', collisions);
    const frame = (time: number) => {
      raf = 0;
      const state = latest.current;
      if (document.hidden || state.paused) {
        last = 0;
        return;
      }
      const delta = last ? Math.min(time - last, 100) : 16.67;
      last = time;
      activeTime += delta;
      accumulator += delta;
      const ids = new Set(state.stars.map((s) => s.id));
      for (const id of w.bodies.keys()) if (!ids.has(id)) w.remove(id);
      const pending = state.stars.filter((s) => !w.bodies.has(s.id));
      if (state.reduced) {
        for (const star of pending) w.add(star.id, true, star.category);
        paint();
        last = 0;
        return;
      }
      if (pending.length && time >= nextSpawn) {
        w.add(pending[0].id, false, pending[0].category);
        nextSpawn = time + 100;
        idle = 0;
        activeTime = 0;
      }
      while (accumulator >= 1000 / 60) {
        w.step();
        accumulator -= 1000 / 60;
      }
      paint();
      idle = w.asleep && !pending.length ? idle + delta : 0;
      // A finite escape hatch prevents pathological resting contacts burning battery.
      if (activeTime > 15000 && !pending.length) {
        for (const b of w.bodies.values()) Matter.Sleeping.set(b, true);
      }
      if (idle < 2000) raf = requestAnimationFrame(frame);
      else last = 0;
    };
    const start = () => {
      if (!raf && !document.hidden && !latest.current.paused) {
        idle = 0;
        activeTime = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    wake.current = start;
    const visibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
      } else start();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    document.addEventListener('visibilitychange', visibility);
    const pick = (event: PointerEvent) => {
      if (!latest.current.onPick || latest.current.paused) return;
      const rect = el.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 400;
      const y = ((event.clientY - rect.top) / rect.height) * 420;
      const star = hitTest(
        [...w.bodies.values()],
        new Map(latest.current.stars.map((s) => [s.id, s])),
        x,
        y,
      );
      if (star) latest.current.onPick(star, { x: event.clientX, y: event.clientY });
    };
    el.addEventListener('pointerup', pick);
    resize();
    start();
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      el.removeEventListener('pointerup', pick);
      document.removeEventListener('visibilitychange', visibility);
      wake.current = () => {};
      world.current = null;
      w.dispose();
    };
  }, [jarId, reduced]);
  useEffect(() => {
    if (shake && !reduced) {
      world.current?.shake();
      wake.current();
    }
  }, [shake, reduced]);
  return (
    <div className="jar-scene" role="img" aria-label={label}>
      <svg className="jar-back" viewBox="0 0 400 420" aria-hidden="true">
        <defs>
          <linearGradient id="glass-fill">
            <stop stopColor="#E7B866" stopOpacity=".14" />
            <stop offset=".18" stopColor="#BCD7FF" stopOpacity=".03" />
            <stop offset=".7" stopColor="#829DCF" stopOpacity=".06" />
            <stop offset="1" stopColor="#D8C9FF" stopOpacity=".19" />
          </linearGradient>
          <linearGradient id="glass-edge">
            <stop stopColor="#E7B866" />
            <stop offset=".08" stopColor="#FFF0C6" />
            <stop offset=".24" stopColor="#FAEAC4" stopOpacity=".55" />
            <stop offset=".52" stopColor="#7C90BC" stopOpacity=".45" />
            <stop offset=".82" stopColor="#BDBCEC" />
            <stop offset=".94" stopColor="#F7E2A9" />
            <stop offset="1" stopColor="#E7B866" />
          </linearGradient>
          <linearGradient id="rim-fill" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#F7F1DF" stopOpacity=".15" />
            <stop offset=".3" stopColor="#0A1429" stopOpacity=".6" />
            <stop offset=".65" stopColor="#E7B866" stopOpacity=".18" />
            <stop offset="1" stopColor="#A8BCE6" stopOpacity=".25" />
          </linearGradient>
          <filter id="glass-soft" x="-.3" y="-.2" width="1.6" height="1.4">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <radialGradient id="ground">
            <stop stopColor="#E7B866" stopOpacity=".2" />
            <stop offset="1" stopColor="#E7B866" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="200" cy="389" rx="145" ry="22" fill="url(#ground)" />
        <path
          d={JAR_PATH}
          fill="none"
          stroke="url(#glass-edge)"
          strokeWidth="9"
          opacity=".25"
          filter="url(#glass-soft)"
        />
        <path d={JAR_PATH} fill="url(#glass-fill)" stroke="url(#glass-edge)" strokeWidth="3" />
        <path
          d="M103 152 L103 328 Q103 354 128 354"
          fill="none"
          stroke="#FFE4AC"
          strokeWidth="5"
          opacity=".14"
        />
        <path
          d="M297 151 L297 326 Q297 349 279 353"
          fill="none"
          stroke="#C7C4FC"
          strokeWidth="4"
          opacity=".22"
        />
        <path
          d="M123 120 Q94 136 94 161 L94 331 Q94 360 123 363 L278 363 Q305 357 305 334 L305 160 Q305 134 279 120"
          fill="none"
          stroke="url(#glass-edge)"
          strokeWidth="1.2"
          opacity=".5"
        />
        <path
          d="M102 153 L102 329"
          stroke="#F7DDA5"
          strokeWidth="9"
          opacity=".08"
          filter="url(#glass-soft)"
        />
        <path
          d="M288 148 L288 332"
          stroke="#BEC5F3"
          strokeWidth="12"
          opacity=".11"
          filter="url(#glass-soft)"
        />
      </svg>
      <canvas ref={canvas} className="jar-stars" aria-hidden="true" />
      <svg className="jar-front" viewBox="0 0 400 420" aria-hidden="true">
        <path d={JAR_PATH} fill="none" stroke="url(#glass-edge)" strokeWidth="1" opacity=".6" />
        <ellipse
          cx="200"
          cy="76"
          rx="87"
          ry="13"
          fill="#0D1833"
          fillOpacity=".4"
          stroke="url(#glass-edge)"
          strokeWidth="3"
        />
        <path
          d="M113 76v15c0 18 174 18 174 0V76c0 18-174 18-174 0Z"
          fill="url(#rim-fill)"
          stroke="url(#glass-edge)"
          strokeWidth="2"
        />
        <ellipse
          cx="200"
          cy="76"
          rx="80"
          ry="8"
          fill="none"
          stroke="#B5BCD8"
          strokeWidth=".8"
          opacity=".6"
        />
        <ellipse
          cx="200"
          cy="91"
          rx="87"
          ry="13"
          fill="none"
          stroke="url(#glass-edge)"
          strokeWidth="1.5"
        />
        <ellipse
          cx="200"
          cy="360"
          rx="101"
          ry="12"
          fill="url(#rim-fill)"
          stroke="url(#glass-edge)"
          strokeWidth="2"
          opacity=".65"
        />
        <ellipse
          cx="200"
          cy="360"
          rx="90"
          ry="7"
          fill="none"
          stroke="#E7B866"
          strokeWidth=".8"
          opacity=".45"
        />
        <path
          d="M128 127q-22 12-22 40v133"
          stroke="#FFEBBD"
          opacity=".3"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M285 132q13 15 13 43v91"
          stroke="#C7B5EF"
          opacity=".4"
          strokeWidth="2"
          fill="none"
        />
      </svg>
    </div>
  );
}

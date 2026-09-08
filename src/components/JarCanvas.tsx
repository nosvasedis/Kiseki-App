import { useEffect, useLayoutEffect, useRef } from 'react';
import Matter from 'matter-js';
import {
  JarWorld,
  JAR_GLOW_PAD,
  JAR_H,
  JAR_PATH,
  JAR_W,
  hitTest,
  paintStars,
  pointInJar,
  starPaintRadius,
  type StarOrigin,
} from '../lib/physics';
import { COLORS, starRadius, type Star } from '../lib/models';
import { clink } from '../lib/sensory';
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
  liftId?: string | null;
  onPick?: (star: Star, origin: { x: number; y: number }) => void;
  onApex?: (origin: StarOrigin) => void;
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
  liftId,
  onPick,
  onApex,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<JarWorld | null>(null);
  const wake = useRef<() => void>(() => {});
  const latest = useRef({ stars, reduced, paused, freshId, volume, hiddenId, liftId, onPick, onApex });
  latest.current = { stars, reduced, paused, freshId, volume, hiddenId, liftId, onPick, onApex };
  useLayoutEffect(() => {
    wake.current();
  }, [stars, reduced, paused, freshId, volume, hiddenId, liftId, onPick, onApex]);
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
      activeTime = 0,
      apexSent = false,
      apexTimer = 0;
    const played = new Map<string, number>();
    let burst = 0,
      burstAt = 0;
    const sceneBox = () => {
      const scene = el.closest('.jar-scene');
      return (scene instanceof HTMLElement ? scene : el).getBoundingClientRect();
    };
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      el.width = JAR_W * dpr;
      el.height = (JAR_H + JAR_GLOW_PAD) * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, JAR_GLOW_PAD * dpr);
      paint();
    };
    const paint = () =>
      paintStars(
        ctx,
        [...w.bodies.values()],
        new Map(latest.current.stars.map((s) => [s.id, s])),
        latest.current.hiddenId ? new Set([latest.current.hiddenId]) : undefined,
        latest.current.freshId,
        latest.current.liftId,
        w.apex,
      );
    const collisions = (event: Matter.IEventCollision<Matter.Engine>) => {
      const now = performance.now();
      const byId = new Map(latest.current.stars.map((s) => [s.id, s]));
      const vol = latest.current.volume;
      for (const pair of event.pairs) {
        const a = byId.get(pair.bodyA.label);
        const b = byId.get(pair.bodyB.label);
        if (!a || !b) continue;
        const rel = Math.hypot(
          pair.bodyA.velocity.x - pair.bodyB.velocity.x,
          pair.bodyA.velocity.y - pair.bodyB.velocity.y,
        );
        if (rel < 0.95) continue;
        const key = a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
        if (now - (played.get(key) ?? 0) < 110) continue;
        played.set(key, now);
        if (now - burstAt > 400) burst = 0;
        if (burst === 0) burstAt = now;
        if (burst >= 9) continue;
        const delay = burst * 0.04;
        burst += 1;
        const warm = a.id === latest.current.freshId || b.id === latest.current.freshId ? 0.38 : 0.2;
        const gain = vol * Math.min(0.42, warm + rel * 0.04);
        clink(COLORS.indexOf(a.colorId), gain, delay);
        if (rel > 2.2) clink(COLORS.indexOf(b.colorId), gain * 0.72, delay + 0.05);
      }
    };
    Matter.Events.on(w.engine, 'collisionStart', collisions);
    const frame = (time: number) => {
      raf = 0;
      const state = latest.current;
      if (document.hidden || state.paused) {
        paint();
        last = 0;
        return;
      }
      const delta = last ? Math.min(time - last, 100) : 16.67;
      last = time;
      activeTime += delta;
      accumulator += delta;
      const ids = new Set(state.stars.map((s) => s.id));
      for (const id of w.bodies.keys()) if (!ids.has(id)) w.remove(id);
      if (state.liftId && w.lifting !== state.liftId) {
        apexSent = false;
        window.clearTimeout(apexTimer);
        if (!w.lift(state.liftId)) {
          const rect = sceneBox();
          latest.current.onApex?.({
            x: rect.left + rect.width * 0.5,
            y: rect.top + (40 / JAR_H) * rect.height,
            size: 36,
            angle: 0,
          });
        }
      }
      if (!state.liftId && w.lifting) w.release();
      const pending = state.stars.filter((s) => !w.bodies.has(s.id));
      for (const star of state.stars) w.resize(star.id, starRadius(star));
      if (state.reduced) {
        for (const star of pending) w.add(star.id, true, star.category, star.text);
        paint();
        last = 0;
        return;
      }
      if (pending.length && time >= nextSpawn) {
        w.add(pending[0].id, false, pending[0].category, pending[0].text);
        nextSpawn = time + 100;
        idle = 0;
        activeTime = 0;
      }
      while (accumulator >= 1000 / 60) {
        w.step();
        accumulator -= 1000 / 60;
      }
      if (w.apex && !apexSent) {
        apexSent = true;
        const body = state.liftId ? w.bodies.get(state.liftId) : null;
        const star = body && state.stars.find((s) => s.id === body.label);
        const rect = sceneBox();
        const radius = star ? starPaintRadius(star, true, true) : 16;
        latest.current.onApex?.({
          x: rect.left + ((body?.position.x ?? 200) / JAR_W) * rect.width,
          y: rect.top + ((body?.position.y ?? 40) / JAR_H) * rect.height,
          size: radius * 2 * (rect.width / JAR_W),
          angle: body?.angle ?? 0,
        });
      }
      paint();
      const glowing = state.stars.some((s) => s.isFavorite);
      const moving =
        w.shaking ||
        w.jostleLeft > 0 ||
        [...w.bodies.values()].some((b) => Math.hypot(b.velocity.x, b.velocity.y) > 0.08);
      if (moving) activeTime = 0;
      idle = w.asleep && !pending.length && !state.liftId && !moving ? idle + delta : 0;
      if (activeTime > 15000 && !pending.length && !state.liftId && !moving) {
        for (const b of w.bodies.values()) Matter.Sleeping.set(b, true);
      }
      if (idle < 2000 || glowing || state.liftId || moving) raf = requestAnimationFrame(frame);
      else last = 0;
    };
    const start = () => {
      if (document.hidden) return;
      paint();
      if (latest.current.paused) {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
        return;
      }
      if (!raf) {
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
      if (latest.current.paused || latest.current.liftId) return;
      const rect = sceneBox();
      const x = ((event.clientX - rect.left) / rect.width) * JAR_W;
      const y = ((event.clientY - rect.top) / rect.height) * JAR_H;
      const star = hitTest(
        [...w.bodies.values()],
        new Map(latest.current.stars.map((s) => [s.id, s])),
        x,
        y,
      );
      if (star) {
        latest.current.onPick?.(star, { x: event.clientX, y: event.clientY });
        return;
      }
      if (!pointInJar(x, y) || latest.current.reduced) return;
      w.jostle(x, y);
      idle = 0;
      activeTime = 0;
      wake.current();
      const scene = el.closest('.jar-scene');
      if (scene instanceof HTMLElement) {
        scene.classList.remove('is-wiggle');
        void scene.offsetWidth;
        scene.classList.add('is-wiggle');
      }
    };
    const endWiggle = (event: Event) => {
      if ('animationName' in event && event.animationName !== 'jar-wiggle') return;
      (event.currentTarget as HTMLElement | null)?.classList.remove('is-wiggle');
    };
    const scene = el.closest('.jar-scene');
    scene?.addEventListener('animationend', endWiggle);
    el.addEventListener('pointerup', pick);
    resize();
    start();
    const stir = window.setInterval(() => {
      if (document.hidden || latest.current.paused || latest.current.reduced) return;
      w.stir();
      wake.current();
    }, 2800);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(apexTimer);
      window.clearInterval(stir);
      observer.disconnect();
      el.removeEventListener('pointerup', pick);
      scene?.removeEventListener('animationend', endWiggle);
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

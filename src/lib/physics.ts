import Matter from 'matter-js';
import {
  CAPACITY,
  CATEGORY_TRAITS,
  PALETTE,
  starRadius,
  type Category,
  type KisekiVisual,
  type Star,
} from './models';
export const JAR_PATH =
  'M118 76 L118 108 Q88 122 88 150 L88 336 Q88 369 120 369 L280 369 Q312 369 312 336 L312 150 Q312 122 282 108 L282 76';
export const WALL_POINTS = [
  [118, 58],
  [118, 108],
  [98, 123],
  [88, 150],
  [88, 336],
  [96, 357],
  [120, 369],
  [280, 369],
  [304, 357],
  [312, 336],
  [312, 150],
  [302, 123],
  [282, 108],
  [282, 58],
];
export function boundaries() {
  return WALL_POINTS.slice(1).map((p, i) => {
    const a = WALL_POINTS[i];
    const dx = p[0] - a[0],
      dy = p[1] - a[1];
    return Matter.Bodies.rectangle(
      (p[0] + a[0]) / 2,
      (p[1] + a[1]) / 2,
      Math.hypot(dx, dy) + 6,
      10,
      {
        isStatic: true,
        angle: Math.atan2(dy, dx),
        friction: 0.28,
        frictionStatic: 0.38,
        restitution: 0.26,
        slop: 0.04,
      },
    );
  });
}
function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((n) =>
      Math.round(Math.min(255, Math.max(0, n)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}
function mix(a: string, b: string, t: number) {
  const [ar, ag, ab] = hexRgb(a),
    [br, bg, bb] = hexRgb(b);
  return rgbHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}
function starPoints(r: number, inner = 0.53, stretch = 1, tips = 5) {
  const n = tips * 2;
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / tips;
    const length = (i % 2 ? r * inner : r) * (i % 2 ? 1 : stretch);
    return [Math.cos(a) * length, Math.sin(a) * length] as [number, number];
  });
}
function fillFaceted(
  ctx: CanvasRenderingContext2D,
  points: [number, number][],
  r: number,
  color: string,
) {
  const light = mix(color, '#fff8ec', 0.5);
  const cool = mix(color, '#a8c4ff', 0.32);
  const warm = mix(color, '#ffd7a0', 0.28);
  for (let i = 0; i < points.length; i++) {
    const gradient = ctx.createRadialGradient(0, 0, r * 0.08, 0, 0, r);
    gradient.addColorStop(0, light);
    gradient.addColorStop(0.42, i % 2 ? color : warm);
    gradient.addColorStop(1, i % 2 ? cool : color);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(...points[i]);
    ctx.lineTo(...points[(i + 1) % points.length]);
    ctx.closePath();
    ctx.globalAlpha = i % 2 ? 0.96 : 0.84;
    ctx.fillStyle = gradient;
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.72;
  ctx.strokeStyle = mix(color, '#fff4d6', 0.28);
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    if (i === 0) ctx.moveTo(...points[i]);
    else ctx.lineTo(...points[i]);
  }
  ctx.closePath();
  ctx.stroke();
}
function heartPath(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.38);
  ctx.bezierCurveTo(s * 0.5, -s * 0.02, s * 0.38, -s * 0.52, 0, -s * 0.18);
  ctx.bezierCurveTo(-s * 0.38, -s * 0.52, -s * 0.5, -s * 0.02, 0, s * 0.38);
}
function engrave(
  ctx: CanvasRenderingContext2D,
  r: number,
  color: string,
  visual: KisekiVisual,
  angle: number,
) {
  if (r < 10) return;
  const ink = mix(color, '#fff8ec', 0.62);
  const s = r * 0.3;
  ctx.save();
  ctx.rotate(-angle);
  ctx.globalAlpha = 0.78;
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = Math.max(0.7, r * 0.055);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (visual === 'sharp') {
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.7);
    ctx.lineTo(s * 0.22, -s * 0.08);
    ctx.lineTo(0, -s * 0.28);
    ctx.lineTo(-s * 0.22, -s * 0.08);
    ctx.closePath();
    ctx.stroke();
  } else if (visual === 'heart') {
    heartPath(ctx, s * 0.95);
    ctx.stroke();
  } else if (visual === 'moon') {
    ctx.beginPath();
    ctx.arc(-s * 0.06, 0, s * 0.55, Math.PI * 0.35, Math.PI * 1.65);
    ctx.arc(s * 0.18, -s * 0.08, s * 0.42, Math.PI * 1.55, Math.PI * 0.48, true);
    ctx.closePath();
    ctx.stroke();
  } else if (visual === 'flame') {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.55);
    ctx.quadraticCurveTo(s * 0.38, s * 0.05, 0, -s * 0.72);
    ctx.quadraticCurveTo(-s * 0.38, s * 0.05, 0, s * 0.55);
    ctx.stroke();
  } else if (visual === 'ring') {
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.55);
    ctx.lineTo(s * 0.38, 0);
    ctx.lineTo(0, s * 0.55);
    ctx.lineTo(-s * 0.38, 0);
    ctx.closePath();
    ctx.stroke();
  } else if (visual === 'leaf') {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.58);
    ctx.quadraticCurveTo(s * 0.48, 0, 0, -s * 0.62);
    ctx.quadraticCurveTo(-s * 0.48, 0, 0, s * 0.58);
    ctx.moveTo(0, s * 0.2);
    ctx.lineTo(0, -s * 0.35);
    ctx.stroke();
  } else if (visual === 'spark') {
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.7);
    ctx.lineTo(0, s * 0.7);
    ctx.moveTo(-s * 0.7, 0);
    ctx.lineTo(s * 0.7, 0);
    ctx.moveTo(-s * 0.42, -s * 0.42);
    ctx.lineTo(s * 0.42, s * 0.42);
    ctx.stroke();
  } else if (visual === 'bloom') {
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i * (Math.PI * 2)) / 3;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * s * 0.28, Math.sin(a) * s * 0.28, s * 0.22, s * 0.12, a, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}
function traitsOf(category?: Category) {
  return CATEGORY_TRAITS[category ?? 'effort'];
}
export function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  angle = 0,
  category?: Category,
  lit = false,
  loved = false,
  beat = 0,
) {
  const traits = traitsOf(category);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const [cr, cg, cb] = hexRgb(color);
  const glowR = lit ? r * 2.85 : loved ? r * (2.15 + beat * 0.45) : r * (traits.visual === 'spark' ? 1.55 : 1.35);
  const glowA = lit ? 0.5 : loved ? 0.3 + beat * 0.12 : 0.18;
  const halo = ctx.createRadialGradient(0, 0, r * 0.12, 0, 0, glowR);
  halo.addColorStop(0, `rgba(${cr},${cg},${cb},${glowA})`);
  halo.addColorStop(0.4, `rgba(${cr},${cg},${cb},${glowA * 0.4})`);
  halo.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, glowR, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = loved ? mix(color, '#fff8ec', 0.4) : color;
  ctx.shadowBlur = lit ? r * 0.35 : loved ? r * (0.7 + beat * 0.25) : r * 0.32;
  if (loved) {
    ctx.globalAlpha = 0.22 + beat * 0.12;
    ctx.fillStyle = mix(color, '#fff8ec', 0.42);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = mix(color, '#fff8ec', 0.7);
    ctx.lineWidth = 0.85;
    ctx.globalAlpha = 0.38 + beat * 0.22;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.55 + beat * 0.2;
    ctx.strokeStyle = mix('#fff8ec', color, 0.25);
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + beat * 0.12;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2);
      ctx.lineTo(Math.cos(a) * r * 1.62, Math.sin(a) * r * 1.62);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  const stretch = traits.visual === 'flame' ? 1.18 : traits.visual === 'moon' ? 0.9 : 1;
  const inner =
    traits.visual === 'spark' ? 0.44 : traits.visual === 'bloom' ? 0.6 : traits.visual === 'heart' ? 0.57 : 0.52;
  const points = starPoints(r, inner, stretch, traits.tips);
  fillFaceted(ctx, points, r, loved ? mix(color, '#fff8ec', 0.22) : color);
  ctx.globalAlpha = loved ? 0.78 : 0.42;
  ctx.fillStyle = mix(color, '#fff8ec', loved ? 0.86 : 0.6);
  ctx.beginPath();
  ctx.arc(0, -r * 0.06, r * (loved ? 0.22 : 0.12), 0, Math.PI * 2);
  ctx.fill();
  engrave(ctx, r, color, traits.visual, angle);
  ctx.restore();
}
export const JAR_W = 400;
export const JAR_H = 420;
export const JAR_GLOW_PAD = 96;
export function paintStars(
  ctx: CanvasRenderingContext2D,
  bodies: Matter.Body[],
  stars: Map<string, Star>,
  hidden?: ReadonlySet<string>,
  litId?: string | null,
  liftId?: string | null,
  atApex = false,
) {
  ctx.clearRect(0, -JAR_GLOW_PAD, JAR_W, JAR_H + JAR_GLOW_PAD);
  for (const b of bodies) {
    if (hidden?.has(b.label)) continue;
    const star = stars.get(b.label);
    if (!star) continue;
    const lifting = star.id === liftId;
    const loved = star.isFavorite;
    const beat = loved ? Math.sin(performance.now() / 380 + b.position.x * 0.02) : 0;
    const radius = starPaintRadius(star, lifting, atApex);
    drawStar(
      ctx,
      b.position.x,
      b.position.y,
      radius,
      PALETTE[star.colorId],
      b.angle,
      star.category,
      star.id === litId || lifting,
      loved,
      beat,
    );
  }
}
export function starPaintRadius(star: Pick<Star, 'text' | 'category' | 'isFavorite'>, lifting = false, atApex = false) {
  return (starRadius(star) + 1) * (lifting ? (atApex ? 1.38 : 1.16) : star.isFavorite ? 1.06 : 1);
}
export type StarOrigin = { x: number; y: number; size: number; angle: number };
export function pointInJar(x: number, y: number) {
  let inside = false;
  for (let i = 0, j = WALL_POINTS.length - 1; i < WALL_POINTS.length; j = i++) {
    const [xi, yi] = WALL_POINTS[i];
    const [xj, yj] = WALL_POINTS[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + Number.MIN_VALUE) + xi)
      inside = !inside;
  }
  return inside;
}
export function hitTest(
  bodies: Matter.Body[],
  stars: Map<string, Star>,
  x: number,
  y: number,
): Star | null {
  let best: { star: Star; d: number } | null = null;
  for (const b of bodies) {
    const star = stars.get(b.label);
    if (!star) continue;
    const d = Math.hypot(b.position.x - x, b.position.y - y);
    const reach = starRadius(star) + 8;
    if (d <= reach && (!best || d < best.d)) best = { star, d };
  }
  return best?.star ?? null;
}
export class JarWorld {
  engine = Matter.Engine.create({
    enableSleeping: true,
    positionIterations: 8,
    velocityIterations: 6,
    constraintIterations: 2,
  });
  bodies = new Map<string, Matter.Body>();
  kinds = new Map<string, Category>();
  radii = new Map<string, number>();
  lifting: string | null = null;
  apex = false;
  steps = 0;
  walls: Matter.Body[] = [];
  wallRest: { x: number; y: number }[] = [];
  jostleLeft = 0;
  shaking = false;
  constructor() {
    this.engine.gravity.y = 0.72;
    this.engine.gravity.scale = 0.001;
    this.walls = boundaries();
    this.wallRest = this.walls.map((w) => ({ x: w.position.x, y: w.position.y }));
    Matter.Composite.add(this.engine.world, this.walls);
  }
  add(id: string, seated = false, category: Category = 'effort', text = '') {
    if (this.bodies.has(id) || this.bodies.size >= CAPACITY) return;
    const i = this.bodies.size;
    const trait = CATEGORY_TRAITS[category];
    const radius = starRadius({ text, category });
    const b = Matter.Bodies.polygon(
      seated ? 108 + (i % 6) * 37 : 200 + (Math.random() - 0.5) * 30,
      seated ? 350 - Math.floor(i / 6) * 38 : 45,
      trait.sides,
      radius,
      {
        label: id,
        density: trait.density,
        friction: trait.friction,
        frictionStatic: trait.frictionStatic,
        frictionAir: trait.frictionAir,
        restitution: trait.restitution,
        chamfer: { radius: Math.max(0.55, Math.min(2, radius * 0.14)) },
        sleepThreshold: 60,
        slop: 0.045,
      },
    );
    this.bodies.set(id, b);
    this.kinds.set(id, category);
    this.radii.set(id, radius);
    Matter.Composite.add(this.engine.world, b);
    if (seated) Matter.Sleeping.set(b, true);
    else {
      Matter.Body.setVelocity(b, {
        x: (Math.random() - 0.5) * (trait.drift / 8),
        y: 0.4 + Math.random() * 0.8,
      });
      Matter.Body.setAngularVelocity(b, (Math.random() - 0.5) * trait.spin);
    }
  }
  remove(id: string) {
    const b = this.bodies.get(id);
    if (b) Matter.Composite.remove(this.engine.world, b);
    this.bodies.delete(id);
    this.kinds.delete(id);
    this.radii.delete(id);
  }
  resize(id: string, radius: number) {
    const b = this.bodies.get(id);
    const have = this.radii.get(id);
    if (!b || have == null || Math.abs(have - radius) < 0.45) return;
    Matter.Sleeping.set(b, false);
    Matter.Body.scale(b, radius / have, radius / have);
    this.radii.set(id, radius);
  }
  jostle(originX = 200, originY = 240) {
    this.jostleLeft = 36;
    this.shaking = true;
    const bump = originX < 200 ? 2.7 : -2.7;
    for (const [id, b] of this.bodies) {
      if (id === this.lifting) continue;
      const dx = b.position.x - originX;
      const dy = b.position.y - originY;
      const d = Math.max(20, Math.hypot(dx, dy));
      const power = Math.min(2.35, 108 / d);
      Matter.Sleeping.set(b, false);
      Matter.Body.setVelocity(b, {
        x: b.velocity.x + bump * (0.8 + Math.random() * 0.45) + (dx / d) * power,
        y: b.velocity.y + (dy / d) * power * 0.3 + (Math.random() - 0.5) * 0.55,
      });
      Matter.Body.setAngularVelocity(b, b.angularVelocity + (Math.random() - 0.5) * 0.28);
    }
  }
  private shakeWorld() {
    if (this.jostleLeft <= 0) {
      if (this.shaking) {
        this.engine.gravity.x = 0;
        this.shaking = false;
      }
      return;
    }
    const total = 36;
    const i = total - this.jostleLeft;
    this.jostleLeft -= 1;
    const decay = this.jostleLeft / total;
    this.engine.gravity.x = Math.sin(i * 0.88) * 0.34 * decay;
  }
  shake() {
    for (const [id, b] of this.bodies) {
      const trait = CATEGORY_TRAITS[this.kinds.get(id) ?? 'effort'];
      Matter.Sleeping.set(b, false);
      Matter.Body.setVelocity(b, {
        x: (Math.random() * 2 - 1) * trait.impulseX,
        y: -(trait.impulseY + Math.random() * trait.impulseY * 0.35),
      });
      Matter.Body.setAngularVelocity(b, (Math.random() - 0.5) * trait.spin * 8);
    }
  }
  lift(id: string) {
    const b = this.bodies.get(id);
    if (!b) return false;
    this.lifting = id;
    this.apex = false;
    Matter.Sleeping.set(b, false);
    for (const other of this.bodies.values()) {
      if (other === b) continue;
      const dx = other.position.x - b.position.x;
      const dy = other.position.y - b.position.y;
      const d = Math.hypot(dx, dy);
      if (d <= 0 || d > 52) continue;
      Matter.Sleeping.set(other, false);
      Matter.Body.setVelocity(other, {
        x: other.velocity.x + (dx / d) * 2.1,
        y: other.velocity.y + (dy / d) * 1.4 - 0.35,
      });
    }
    Matter.Body.setVelocity(b, { x: (200 - b.position.x) * 0.06, y: -2.8 });
    Matter.Body.setAngularVelocity(b, 0.1);
    return true;
  }
  release() {
    const id = this.lifting;
    this.lifting = null;
    this.apex = false;
    const b = id ? this.bodies.get(id) : null;
    if (!b) return;
    b.isSensor = false;
    Matter.Sleeping.set(b, false);
    if (b.position.y < 96) Matter.Body.setPosition(b, { x: 200 + (Math.random() - 0.5) * 18, y: 50 });
    Matter.Body.setVelocity(b, { x: (Math.random() - 0.5) * 1.5, y: 2.4 });
    Matter.Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.16);
  }
  stir() {
    const list = [...this.bodies.values()].filter((b) => b.label !== this.lifting);
    if (!list.length) return;
    const n = Math.min(3, list.length);
    for (let i = 0; i < n; i++) {
      const b = list[(i * 7 + this.steps) % list.length];
      Matter.Sleeping.set(b, false);
      Matter.Body.setVelocity(b, {
        x: b.velocity.x + (Math.random() - 0.5) * 0.32,
        y: b.velocity.y - 0.06 - Math.random() * 0.1,
      });
      Matter.Body.setAngularVelocity(b, b.angularVelocity + (Math.random() - 0.5) * 0.018);
    }
  }
  step() {
    this.shakeWorld();
    Matter.Engine.update(this.engine, 1000 / 60);
    this.steps++;
    const lift = this.lifting ? this.bodies.get(this.lifting) : null;
    if (lift) {
      Matter.Sleeping.set(lift, false);
      const ease = lift.position.y > 110 ? 0.05 : 0.11;
      const x = lift.position.x + (200 - lift.position.x) * ease;
      const y = lift.position.y + (40 - lift.position.y) * ease;
      if (lift.position.y < 100) lift.isSensor = true;
      Matter.Body.setPosition(lift, { x, y });
      Matter.Body.setVelocity(lift, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(lift, lift.angularVelocity * 0.96 + 0.005);
      if (Math.hypot(x - 200, y - 40) < 7) this.apex = true;
    }
    for (const b of this.bodies.values()) {
      if (b.label === this.lifting) continue;
      if (b.position.y > 400 || b.position.x < 60 || b.position.x > 340) {
        Matter.Body.setPosition(b, { x: 200, y: 145 });
        Matter.Body.setVelocity(b, { x: 0, y: 0 });
      }
    }
  }
  get asleep() {
    return [...this.bodies.values()].every((b) => b.isSleeping);
  }
  dispose() {
    Matter.Events.off(this.engine, 'collisionStart');
    Matter.Composite.clear(this.engine.world, false);
    Matter.Engine.clear(this.engine);
    this.bodies.clear();
    this.kinds.clear();
    this.radii.clear();
    this.lifting = null;
    this.apex = false;
    this.jostleLeft = 0;
    this.walls = [];
    this.wallRest = [];
  }
}

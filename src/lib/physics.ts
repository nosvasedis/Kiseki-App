import Matter from 'matter-js';
import { CATEGORY_TRAITS, PALETTE, type Category, type KisekiVisual, type Star } from './models';
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
      { isStatic: true, angle: Math.atan2(dy, dx), friction: 0.2, restitution: 0.15 },
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
) {
  const traits = traitsOf(category);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.shadowColor = color;
  ctx.shadowBlur = lit ? r * 2.4 : r * (traits.visual === 'spark' ? 1.25 : 0.95);
  const stretch = traits.visual === 'flame' ? 1.18 : traits.visual === 'moon' ? 0.9 : 1;
  const inner =
    traits.visual === 'spark' ? 0.44 : traits.visual === 'bloom' ? 0.6 : traits.visual === 'heart' ? 0.57 : 0.52;
  const points = starPoints(r, inner, stretch, traits.tips);
  fillFaceted(ctx, points, r, color);
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = mix(color, '#fff8ec', 0.6);
  ctx.beginPath();
  ctx.arc(0, -r * 0.06, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  engrave(ctx, r, color, traits.visual, angle);
  ctx.restore();
}
export function paintStars(
  ctx: CanvasRenderingContext2D,
  bodies: Matter.Body[],
  stars: Map<string, Star>,
  hidden?: ReadonlySet<string>,
) {
  ctx.clearRect(0, 0, 400, 420);
  for (const b of bodies) {
    if (hidden?.has(b.label)) continue;
    const star = stars.get(b.label);
    if (!star) continue;
    const radius = CATEGORY_TRAITS[star.category].radius + 1;
    drawStar(ctx, b.position.x, b.position.y, radius, PALETTE[star.colorId], b.angle, star.category);
  }
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
    const reach = CATEGORY_TRAITS[star.category].radius + 10;
    if (d <= reach && (!best || d < best.d)) best = { star, d };
  }
  return best?.star ?? null;
}
export class JarWorld {
  engine = Matter.Engine.create({
    enableSleeping: true,
    positionIterations: 6,
    velocityIterations: 4,
  });
  bodies = new Map<string, Matter.Body>();
  kinds = new Map<string, Category>();
  steps = 0;
  constructor() {
    this.engine.gravity.y = 0.6;
    Matter.Composite.add(this.engine.world, boundaries());
  }
  add(id: string, seated = false, category: Category = 'effort') {
    if (this.bodies.has(id) || this.bodies.size >= 45) return;
    const i = this.bodies.size;
    const trait = CATEGORY_TRAITS[category];
    const b = Matter.Bodies.polygon(
      seated ? 113 + (i % 7) * 29 : 200 + (Math.random() - 0.5) * 30,
      seated ? 347 - Math.floor(i / 7) * 27 : 45,
      trait.sides,
      trait.radius,
      {
        label: id,
        density: trait.density,
        friction: trait.friction,
        frictionStatic: trait.frictionStatic,
        frictionAir: trait.frictionAir,
        restitution: trait.restitution,
        chamfer: { radius: 2 },
        sleepThreshold: 60,
      },
    );
    this.bodies.set(id, b);
    this.kinds.set(id, category);
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
  step() {
    Matter.Engine.update(this.engine, 1000 / 60);
    this.steps++;
    for (const b of this.bodies.values()) {
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
  }
}

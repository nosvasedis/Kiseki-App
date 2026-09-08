let context: AudioContext | undefined;
let volume = 0.35;
let muted = false;
let unlocked = false;
let ambient: HTMLAudioElement | undefined;
let fading: number | undefined;
const NOTES = [
  261.63, 293.66, 329.63, 349.23, 392, 440, 466.16, 523.25, 587.33, 659.25, 698.46, 783.99, 880,
  1046.5,
];
export const AMBIENT_SRC = '/assets/kiseki/runtime/origami-stars.mp3';
export const AMBIENT_GAIN = 0.07;
export type Cue = 'tap' | 'open' | 'close' | 'fold' | 'toast' | 'page' | 'lift';
export function ambientGain(master: number) {
  if (!Number.isFinite(master) || master <= 0) return 0;
  return Math.min(1, master) * AMBIENT_GAIN;
}
export function ambientShouldPlay(master: number, hidden: boolean, isUnlocked: boolean, isMuted = false) {
  return Boolean(isUnlocked && !hidden && !isMuted && ambientGain(master) > 0);
}
export function setSoundVolume(value: number) {
  volume = Math.min(1, Math.max(0, value));
  syncAmbient();
}
export function setAmbientMuted(value: boolean) {
  muted = Boolean(value);
  syncAmbient();
}
export function unlockAudio() {
  try {
    context ??= new AudioContext();
    void context.resume().catch(() => {});
    unlocked = true;
    syncAmbient();
  } catch {
    /* Audio is optional. */
  }
}
function hiddenPage() {
  return typeof document !== 'undefined' && document.hidden;
}
function ensureAmbient() {
  if (ambient || typeof Audio === 'undefined') return ambient;
  const el = new Audio(AMBIENT_SRC);
  el.loop = true;
  el.preload = 'auto';
  el.setAttribute('playsinline', '');
  el.setAttribute('aria-hidden', 'true');
  el.volume = 0;
  ambient = el;
  document.body?.appendChild(el);
  return el;
}
function applyAmbientVolume(el: HTMLAudioElement, value: number, stop = false) {
  el.volume = Math.min(1, Math.max(0, value));
  if (stop && value <= 0 && !el.paused) el.pause();
}
function syncAmbient() {
  const want = ambientShouldPlay(volume, hiddenPage(), unlocked, muted);
  if (!want && !ambient) return;
  const el = ensureAmbient();
  if (!el) return;
  const target = want ? ambientGain(volume) : 0;
  if (target > 0 && el.paused) void el.play().catch(() => {});
  if (typeof requestAnimationFrame === 'undefined') {
    applyAmbientVolume(el, target, target <= 0);
    return;
  }
  if (fading) cancelAnimationFrame(fading);
  const from = el.volume;
  const started = performance.now();
  const ms = from < target ? 1800 : 500;
  const tick = (now: number) => {
    const t = Math.min(1, (now - started) / ms);
    applyAmbientVolume(el, from + (target - from) * t, t >= 1 && target <= 0);
    if (t < 1) fading = requestAnimationFrame(tick);
    else fading = undefined;
  };
  fading = requestAnimationFrame(tick);
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', syncAmbient);
}
if (typeof window !== 'undefined') {
  const once = () => {
    window.removeEventListener('pointerdown', once);
    window.removeEventListener('keydown', once);
    unlockAudio();
  };
  window.addEventListener('pointerdown', once);
  window.addEventListener('keydown', once);
}
function tone(freq: number, vol: number, at: number, dur: number, type: OscillatorType = 'sine') {
  if (!context || context.state !== 'running' || vol <= 0) return;
  const ctx = context;
  const osc = ctx.createOscillator(),
    gain = ctx.createGain();
  const now = ctx.currentTime + at;
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(vol * 0.16, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}
export function play(cue: Cue) {
  unlockAudio();
  const v = volume;
  if (v <= 0) return;
  if (cue === 'tap') tone(880, v * 0.42, 0, 0.07);
  else if (cue === 'open') {
    tone(392, v, 0, 0.18);
    tone(523.25, v * 0.8, 0.06, 0.28);
  } else if (cue === 'close') {
    tone(392, v * 0.7, 0, 0.16);
    tone(329.63, v * 0.55, 0.05, 0.22);
  } else if (cue === 'fold') {
    tone(329.63, v, 0, 0.16);
    tone(392, v, 0.07, 0.18);
    tone(523.25, v, 0.14, 0.34);
  } else if (cue === 'toast') tone(440, v * 0.7, 0, 0.35);
  else if (cue === 'lift') {
    tone(523.25, v * 0.7, 0, 0.22);
    tone(659.25, v, 0.08, 0.45);
    tone(880, v * 0.55, 0.18, 0.6);
  } else tone(523.25, v * 0.22, 0, 0.12);
}
export function chime(note: number, vol = volume) {
  unlockAudio();
  tone(NOTES[note % NOTES.length], vol, 0, 1.2);
}
export function clink(note: number, vol = volume, at = 0) {
  unlockAudio();
  const v = Math.min(1, Math.max(0, vol)) * 0.26;
  if (v <= 0) return;
  const f = NOTES[((note % NOTES.length) + NOTES.length) % NOTES.length];
  tone(f, v, at, 0.3, 'sine');
  tone(f * 1.498, v * 0.22, at + 0.02, 0.18, 'triangle');
}
export class ShakeDetector {
  private previous = -Infinity;
  private last = -Infinity;
  sample(x: number, y: number, z: number, time: number) {
    if (![x, y, z, time].every(Number.isFinite)) return false;
    if (Math.hypot(x, y, z) / 9.80665 < 2.5) {
      this.previous = -Infinity;
      return false;
    }
    const trigger = time - this.previous <= 300 && time - this.last >= 1500;
    this.previous = time;
    if (trigger) {
      this.last = time;
      this.previous = -Infinity;
    }
    return trigger;
  }
}
type PermissionMotion = typeof DeviceMotionEvent & { requestPermission?: () => Promise<string> };
export async function requestMotion() {
  if (typeof DeviceMotionEvent === 'undefined' || !window.isSecureContext) return false;
  const api = DeviceMotionEvent as PermissionMotion;
  try {
    return api.requestPermission ? (await api.requestPermission()) === 'granted' : true;
  } catch {
    return false;
  }
}

let context: AudioContext | undefined;
let volume = 0.35;
const NOTES = [
  261.63, 293.66, 329.63, 349.23, 392, 440, 466.16, 523.25, 587.33, 659.25, 698.46, 783.99, 880,
  1046.5,
];
export type Cue = 'tap' | 'open' | 'close' | 'fold' | 'toast' | 'page' | 'lift';
export function setSoundVolume(value: number) {
  volume = Math.min(1, Math.max(0, value));
}
export function unlockAudio() {
  try {
    context ??= new AudioContext();
    void context.resume().catch(() => {});
  } catch {
    /* Audio is optional. */
  }
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

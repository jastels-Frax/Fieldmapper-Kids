/** Little chimes made on the fly with WebAudio: no sound files to download. */
let ctx: AudioContext | null = null;
let enabled = true;

export function setSounds(on: boolean): void {
  enabled = on;
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!C) return null;
  ctx ??= new C();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function notes(freqs: number[], step = 0.09, type: OscillatorType = 'triangle'): void {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime;
  freqs.forEach((f, i) => {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.value = f;
    const t = t0 + i * step;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + 0.4);
  });
}

export const sounds = {
  tap: () => notes([660], 0.05, 'sine'),
  pick: () => notes([523, 784], 0.07),
  save: () => notes([523, 659, 784, 1047], 0.1),
  badge: () => notes([784, 988, 1175, 1568, 1175, 1568], 0.08),
  /** A rare find (rarity.ts): a longer fanfare that climbs an octave. */
  rare: () => notes([523, 659, 784, 1047, 784, 1047, 1319, 1568, 2093], 0.09),
  oops: () => notes([330, 262], 0.12, 'sine'),
};

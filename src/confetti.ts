import { partyPieces, type PartyId } from './look.ts';

/**
 * A celebration over everything, for a moment, in the explorer's own style
 * (My look ▸ Celebrations): paper confetti, stars, leaves or floating bubbles.
 * `emojis` are the moment's own pictures (the find's kind, a badge), mixed in.
 */
export function confetti(emojis: string[] = [], style?: PartyId): void {
  const root = document.documentElement;
  if (root.dataset.motion === 'calm' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const party = style ?? ((root.dataset.party as PartyId | undefined) || 'confetti');
  const pieces = partyPieces(party);
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  document.body.append(canvas);
  const c = canvas.getContext('2d')!;
  c.scale(dpr, dpr);
  const colours = ['#ff6b6b', '#fcc419', '#51cf66', '#339af0', '#cc5de8', '#ff922b'];
  const bubbles = party === 'bubbles';
  const leaves = party === 'leaves';
  const count = bubbles ? 46 : pieces.length ? 70 : 140;
  const parts = Array.from({ length: count }, (_, i) => ({
    x: bubbles || leaves ? Math.random() * innerWidth : innerWidth / 2 + (Math.random() - 0.5) * 80,
    y: bubbles ? innerHeight + 20 + Math.random() * 200 : leaves ? -30 - Math.random() * 300 : innerHeight * 0.55,
    vx: bubbles || leaves ? (Math.random() - 0.5) * 1.5 : (Math.random() - 0.5) * 14,
    vy: bubbles ? -2 - Math.random() * 3 : leaves ? 1 + Math.random() * 2 : -8 - Math.random() * 12,
    r: bubbles ? 10 + Math.random() * 22 : 4 + Math.random() * 6,
    rot: Math.random() * 6,
    vr: (Math.random() - 0.5) * (leaves ? 0.08 : 0.4),
    phase: Math.random() * 6,
    colour: colours[i % colours.length],
    emoji: emojis.length && i % 9 === 0 ? emojis[i % emojis.length] : pieces.length ? pieces[i % pieces.length] : '',
  }));
  const life = bubbles || leaves ? 3200 : 2200;
  const start = performance.now();
  const frame = (now: number) => {
    const t = now - start;
    c.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      if (bubbles) { p.x += p.vx + Math.sin(t / 400 + p.phase) * 0.8; p.y += p.vy; }
      else if (leaves) { p.x += p.vx + Math.sin(t / 500 + p.phase) * 1.6; p.y += p.vy; }
      else { p.vy += 0.35; p.x += p.vx; p.y += p.vy; }
      p.rot += p.vr;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(bubbles ? 0 : p.rot);
      c.globalAlpha = Math.max(0, 1 - t / life);
      if (bubbles && !p.emoji) {
        c.beginPath();
        c.arc(0, 0, p.r, 0, Math.PI * 2);
        c.fillStyle = 'rgba(165, 216, 255, 0.25)';
        c.fill();
        c.lineWidth = 2.5;
        c.strokeStyle = p.colour;
        c.stroke();
        c.beginPath();
        c.arc(-p.r * 0.35, -p.r * 0.35, p.r * 0.22, 0, Math.PI * 2);
        c.fillStyle = 'rgba(255,255,255,0.85)';
        c.fill();
      } else if (p.emoji) {
        c.font = `${pieces.length && !emojis.includes(p.emoji) ? 22 + (p.r % 3) * 6 : 28}px serif`;
        c.fillText(p.emoji, -14, 10);
      } else {
        c.fillStyle = p.colour;
        c.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      }
      c.restore();
    }
    if (t < life) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

/** A burst of confetti over everything, for a moment. */
export function confetti(emojis: string[] = []): void {
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  document.body.append(canvas);
  const c = canvas.getContext('2d')!;
  c.scale(dpr, dpr);
  const colours = ['#ff6b6b', '#fcc419', '#51cf66', '#339af0', '#cc5de8', '#ff922b'];
  const parts = Array.from({ length: 140 }, (_, i) => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 80,
    y: innerHeight * 0.55,
    vx: (Math.random() - 0.5) * 14,
    vy: -8 - Math.random() * 12,
    r: 4 + Math.random() * 6,
    rot: Math.random() * 6,
    vr: (Math.random() - 0.5) * 0.4,
    colour: colours[i % colours.length],
    emoji: emojis.length && i % 9 === 0 ? emojis[i % emojis.length] : '',
  }));
  const start = performance.now();
  const frame = (now: number) => {
    const t = now - start;
    c.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.35;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.globalAlpha = Math.max(0, 1 - t / 2200);
      if (p.emoji) {
        c.font = '28px serif';
        c.fillText(p.emoji, -14, 10);
      } else {
        c.fillStyle = p.colour;
        c.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      }
      c.restore();
    }
    if (t < 2200) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

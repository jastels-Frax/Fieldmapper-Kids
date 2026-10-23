import { h } from './ui.ts';
import { COLOURS } from './categories.ts';

/** A finger-painting canvas. `getBlob` returns the picture, or null if nothing was drawn. */
export function drawPad(): { el: HTMLElement; getBlob: () => Promise<Blob | null> } {
  const SIZE = 900;
  const canvas = h('canvas', { class: 'draw-canvas', width: SIZE, height: SIZE }) as HTMLCanvasElement;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, SIZE, SIZE);
  c.lineCap = 'round';
  c.lineJoin = 'round';

  let colour = '#212529';
  let width = 14;
  let drawn = false;
  const history: ImageData[] = [];
  let last: { x: number; y: number } | null = null;

  const pos = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * SIZE, y: ((e.clientY - r.top) / r.height) * SIZE };
  };
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    history.push(c.getImageData(0, 0, SIZE, SIZE));
    if (history.length > 20) history.shift();
    last = pos(e);
    c.beginPath();
    c.fillStyle = colour;
    c.arc(last.x, last.y, width / 2, 0, Math.PI * 2);
    c.fill();
    drawn = true;
  });
  canvas.addEventListener('pointermove', e => {
    if (!last) return;
    const p = pos(e);
    c.strokeStyle = colour;
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(last.x, last.y);
    c.lineTo(p.x, p.y);
    c.stroke();
    last = p;
  });
  const end = () => { last = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  const swatches = h('div', { class: 'draw-colours' });
  const pickColour = (hex: string, btn: HTMLElement) => {
    colour = hex;
    swatches.querySelectorAll('.on').forEach(x => x.classList.remove('on'));
    btn.classList.add('on');
  };
  for (const col of COLOURS) {
    const b = h('button', { class: 'swatch', type: 'button', style: `--sw:${col.hex}`, 'aria-label': col.label });
    b.addEventListener('click', () => pickColour(col.hex, b));
    if (col.id === 'black') b.classList.add('on');
    swatches.append(b);
  }
  const eraser = h('button', { class: 'swatch eraser', type: 'button', 'aria-label': 'Eraser' }, '🧽');
  eraser.addEventListener('click', () => pickColour('#ffffff', eraser));
  swatches.append(eraser);

  const sizes = h('div', { class: 'draw-sizes' });
  [8, 14, 28].forEach((w, i) => {
    const b = h('button', { class: `brush ${i === 1 ? 'on' : ''}`, type: 'button', 'aria-label': ['Thin', 'Medium', 'Thick'][i] },
      h('span', { style: `width:${w}px;height:${w}px` }));
    b.addEventListener('click', () => {
      width = w;
      sizes.querySelectorAll('.on').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
    });
    sizes.append(b);
  });
  const undo = h('button', { class: 'round-btn', type: 'button', 'aria-label': 'Undo' }, '↩️');
  undo.addEventListener('click', () => {
    const prev = history.pop();
    if (prev) c.putImageData(prev, 0, 0);
  });
  const clear = h('button', { class: 'round-btn', type: 'button', 'aria-label': 'Start again' }, '🆕');
  clear.addEventListener('click', () => {
    history.push(c.getImageData(0, 0, SIZE, SIZE));
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, SIZE, SIZE);
    drawn = false;
  });
  sizes.append(undo, clear);

  return {
    el: h('div', { class: 'draw-pad' }, canvas, swatches, sizes),
    getBlob: () => (drawn ? new Promise(r => canvas.toBlob(b => r(b), 'image/png')) : Promise.resolve(null)),
  };
}

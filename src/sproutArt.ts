/**
 * Picture buttons for Sprouts (docs/AGE_TIERS.md, decision 5: drawings in the
 * crew's style — bold black line, white sticker rim — never licensed photos).
 * Each drawing names the list species it stands for, so a tap is a real pick.
 * Pure strings, no DOM.
 */
import { stickerSvg, INK } from './buddies.ts';

export interface SproutArt {
  id: string;
  /** What a Sprout hears and reads. */
  label: string;
  /** Common names in public/species/ns.json this drawing stands for (tested). */
  species: string[];
  /** One line for the grown-up beside them: how to tell it. */
  tell: string;
  svg: () => string;
}

type Lobe = { a: number; r: number; teeth: number; tooth: number };

/**
 * A palmate leaf from its lobes: each lobe is a tip at angle `a` (degrees,
 * 0 = straight up) and radius `r` from where the stalk joins, with `teeth`
 * notches of depth `tooth` along both edges. Between lobes the outline dips to
 * a sinus: `sinusR` deep, V-shaped (`vSinus`) or U-shaped (rounded).
 */
function leafPath(cx: number, cy: number, lobes: Lobe[], sinusR: number, vSinus: boolean): string {
  const pt = (a: number, r: number) => {
    const t = ((a - 90) * Math.PI) / 180;
    return [cx + Math.cos(t) * r, cy + Math.sin(t) * r] as const;
  };
  const f = (n: number) => n.toFixed(1);
  const parts: string[] = [];
  const edge = (a0: number, r0: number, a1: number, r1: number, teeth: number, tooth: number) => {
    // Straight run from (a0,r0) to (a1,r1) with `teeth` outward notches.
    for (let i = 1; i <= teeth * 2; i++) {
      const k = i / (teeth * 2 + 1);
      const a = a0 + (a1 - a0) * k, r = r0 + (r1 - r0) * k;
      const [x, y] = pt(a + (i % 2 ? 0 : 0), r + (i % 2 ? tooth : -tooth * 0.2));
      parts.push(`L${f(x)},${f(y)}`);
    }
    const [x, y] = pt(a1, r1);
    parts.push(`L${f(x)},${f(y)}`);
  };
  const sorted = [...lobes].sort((p, q) => p.a - q.a);
  const base = pt(0, 0);
  parts.push(`M${f(base[0])},${f(base[1])}`);
  // From the stalk out to the first lobe's outer flank.
  const first = sorted[0];
  const [fx, fy] = pt(first.a - 22, first.r * 0.45);
  parts.push(`L${f(fx)},${f(fy)}`);
  for (let i = 0; i < sorted.length; i++) {
    const l = sorted[i];
    const lead = i === 0 ? { a: first.a - 22, r: first.r * 0.45 } : null;
    const prevSinus = lead ?? { a: (sorted[i - 1].a + l.a) / 2, r: sinusR };
    edge(prevSinus.a, prevSinus.r, l.a, l.r, l.teeth, l.tooth);
    const next = sorted[i + 1];
    const sinus = next ? { a: (l.a + next.a) / 2, r: sinusR } : { a: l.a + 22, r: l.r * 0.45 };
    if (next && !vSinus) {
      // A rounded U between lobes: run down to above the sinus, then curve through it.
      const mid = pt(sinus.a, sinus.r);
      const inA = pt(sinus.a - 6, sinus.r + 8), outA = pt(sinus.a + 6, sinus.r + 8);
      edge(l.a, l.r, sinus.a - 6, sinus.r + 8, l.teeth, l.tooth);
      parts.push(`Q${f(mid[0])},${f(mid[1] + 0)} ${f(outA[0])},${f(outA[1])}`);
      void inA;
    } else {
      edge(l.a, l.r, sinus.a, sinus.r, l.teeth, l.tooth);
    }
  }
  parts.push('Z');
  return parts.join(' ');
}

/**
 * A broad-lobed leaf (Sugar Maple): each lobe is a point with a big tooth on
 * each shoulder, and the gaps between lobes are smooth, rounded U-shapes.
 */
function broadLeafPath(cx: number, cy: number, lobes: { a: number; r: number }[], sinusR: number): string {
  const pt = (a: number, r: number) => {
    const t = ((a - 90) * Math.PI) / 180;
    return `${(cx + Math.cos(t) * r).toFixed(1)},${(cy + Math.sin(t) * r).toFixed(1)}`;
  };
  const L = [...lobes].sort((p, q) => p.a - q.a);
  const d: string[] = [`M${pt(0, 0)}`, `L${pt(L[0].a - 30, L[0].r * 0.38)}`];
  L.forEach((l, i) => {
    // up the near flank: shoulder tooth, notch, then the point, and back down the far side
    d.push(`L${pt(l.a - 17, l.r * 0.66)}`, `L${pt(l.a - 21, l.r * 0.8)}`, `L${pt(l.a - 8, l.r * 0.74)}`, `L${pt(l.a, l.r)}`,
      `L${pt(l.a + 8, l.r * 0.74)}`, `L${pt(l.a + 21, l.r * 0.8)}`, `L${pt(l.a + 17, l.r * 0.66)}`);
    const n = L[i + 1];
    if (n) {
      const mid = (l.a + n.a) / 2;
      // a smooth U through the sinus
      d.push(`Q${pt(mid, sinusR * 0.7)} ${pt(n.a - 17, n.r * 0.66)}`);
    } else {
      d.push(`L${pt(l.a + 30, l.r * 0.38)}`);
    }
  });
  d.push('Z');
  return d.join(' ').replace(/(L|M|Q)(\d)/g, '$1$2');
}

function veins(cx: number, cy: number, lobes: Lobe[], colour: string): string {
  return lobes.map(l => {
    const t = ((l.a - 90) * Math.PI) / 180;
    return `<path d="M${cx},${cy} L${(cx + Math.cos(t) * l.r * 0.78).toFixed(1)},${(cy + Math.sin(t) * l.r * 0.78).toFixed(1)}" stroke="${colour}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
  }).join('');
}

const CX = 128, CY = 172;
const stalk = (colour: string) => `<path d="M128,172 L136,244" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>`
  + `<path d="M128,172 L136,244" stroke="${colour}" stroke-width="5" stroke-linecap="round"/>`;

function leaf(fill: string, vein: string, lobes: Lobe[], sinusR: number, vSinus: boolean, stalkColour = '#8d5524'): string {
  return stalk(stalkColour)
    + `<path d="${leafPath(CX, CY, lobes, sinusR, vSinus)}" fill="${fill}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`
    + veins(CX, CY, lobes, vein);
}

function broadLeaf(fill: string, vein: string, lobes: { a: number; r: number }[], sinusR: number): string {
  return stalk('#8d5524')
    + `<path d="${broadLeafPath(CX, CY, lobes, sinusR)}" fill="${fill}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`
    + veins(CX, CY, lobes.map(l => ({ ...l, teeth: 0, tooth: 0 })), vein);
}

/** Red Maple: three main lobes (two small ones near the stalk), toothed all round, V-shaped gaps. */
const RED_MAPLE_LOBES: Lobe[] = [
  { a: -112, r: 52, teeth: 2, tooth: 4 },
  { a: -54, r: 108, teeth: 4, tooth: 6 },
  { a: 0, r: 132, teeth: 5, tooth: 6 },
  { a: 54, r: 108, teeth: 4, tooth: 6 },
  { a: 112, r: 52, teeth: 2, tooth: 4 },
];

/** Sugar Maple: five broad lobes with a few big teeth, smooth rounded U-shaped gaps. */
const SUGAR_MAPLE_LOBES = [
  { a: -104, r: 82 },
  { a: -54, r: 112 },
  { a: 0, r: 132 },
  { a: 54, r: 112 },
  { a: 104, r: 82 },
];

export const SPROUT_ART: SproutArt[] = [
  {
    id: 'red-maple', label: 'Red Maple', species: ['Red Maple'],
    tell: 'Three big points with little teeth all round, and sharp V-shaped gaps between them. Bright red stems.',
    svg: () => stickerSvg(leaf('#e03131', '#a61e1e', RED_MAPLE_LOBES, 50, true, '#c92a2a')),
  },
  {
    id: 'sugar-maple', label: 'Sugar Maple', species: ['Sugar Maple'],
    tell: 'Five points with smooth edges and round U-shaped gaps between them, like the leaf on the Canadian flag.',
    svg: () => stickerSvg(broadLeaf('#f08c00', '#b35900', SUGAR_MAPLE_LOBES, 60)),
  },
];

/** The drawing for a list species, if there is one. */
export function artFor(speciesName: string): SproutArt | undefined {
  return SPROUT_ART.find(a => a.species.includes(speciesName));
}

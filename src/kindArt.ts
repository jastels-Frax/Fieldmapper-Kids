/**
 * Drawings for the kinds no emoji says (categories.ts `art`): the lichens and their three shapes, moss, a shelf
 * mushroom, a puffball and a wetland. In the crew's sticker style (buddies.ts): flat colour, a bold black line. Small
 * and filter-free, because they also stand on map pins and sticker-book chips. Pure strings: our own constant markup,
 * the one kind of innerHTML this app allows.
 */
import { INK } from './buddies.ts';

const svg = (body: string) =>
  `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>`;
const shape = (d: string, fill: string, w = 2.6) =>
  `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
const line = (d: string, colour = INK, w = 2.4) =>
  `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
/** A stem drawn as a coloured line inside a black one, so it reads as outlined. */
const stem = (d: string, colour: string, w = 4.4) => line(d, INK, w + 2.6) + line(d, colour, w);

const ROCK = 'M7 52 C5 42 12 31 24 29 C33 22 49 23 56 33 C61 41 59 51 52 54 L13 55 C10 55 8 54 7 52 Z';
/** A frilled patch: a lobed outline around (x, y). */
function frill(x: number, y: number, r: number, lobes: number): string {
  const pts: string[] = [];
  for (let i = 0; i < lobes; i++) {
    const a0 = (i / lobes) * Math.PI * 2, a1 = ((i + 1) / lobes) * Math.PI * 2, am = (a0 + a1) / 2;
    const p = (a: number, k: number) => `${(x + Math.cos(a) * r * k).toFixed(1)} ${(y + Math.sin(a) * r * k).toFixed(1)}`;
    if (i === 0) pts.push(`M${p(a0, 0.78)}`);
    pts.push(`Q${p(am, 1.25)} ${p(a1, 0.78)}`);
  }
  return `${pts.join(' ')} Z`;
}

const ART: Record<string, string> = {
  /** A lichen, any shape: a rock with a leafy patch, a crusty one and a red-topped stalk. */
  lichen: svg(
    shape(ROCK, '#b7bdc4')
    + shape(frill(22, 42, 8, 7), '#9cba6a', 2.2)
    + shape('M36 36 C40 33 47 33 50 37 C52 41 48 44 44 43 C41 45 36 43 36 40 Z', '#d3d36a', 2.2)
    + line('M40 38.5 L44 40 M45 36 L46 40', INK, 1.4)
    + stem('M33 46 L33 36', '#c8d5b9', 3)
    + `<circle cx="33" cy="34" r="3.4" fill="#e03131" stroke="${INK}" stroke-width="2"/>`,
  ),
  /** Crusty: flat patches with black edges painted on a rock, like map lichen. */
  crusty: svg(
    shape(ROCK, '#b7bdc4')
    + shape('M14 44 C14 38 21 35 27 38 C32 37 36 41 34 46 C33 51 25 51 21 49 C16 50 13 48 14 44 Z', '#cfd468', 2.2)
    + `<circle cx="20" cy="43" r="1.5" fill="${INK}"/><circle cx="26" cy="46" r="1.3" fill="${INK}"/><circle cx="28" cy="41" r="1.2" fill="${INK}"/>`
    + shape('M38 34 C42 30 50 31 52 36 C55 40 52 45 47 44 C43 46 38 43 38 39 Z', '#e9a23b', 2.2)
    + `<circle cx="45" cy="38" r="1.6" fill="${INK}"/><circle cx="49" cy="40" r="1.3" fill="${INK}"/>`,
  ),
  /** Leafy: a rosette of flat, rounded flaps with paler edges. */
  leafy: svg(
    shape(frill(32, 34, 21, 8), '#8fb36b')
    + shape(frill(32, 34, 11, 6), '#a9c886', 2.2)
    + `<circle cx="32" cy="34" r="3" fill="#6f8f4f" stroke="${INK}" stroke-width="1.8"/>`,
  ),
  /** Bushy: a clump of little branching stalks, two with red tops (reindeer lichen and British soldiers). */
  bushy: svg(
    line('M8 56 L56 56', INK, 2.6)
    + stem('M18 55 L18 40 L13 31 M18 40 L23 32', '#cfdcc0')
    + stem('M30 55 L30 34 L25 24 M30 34 L35 25 M30 44 L37 38', '#cfdcc0')
    + stem('M44 55 L44 38 L39 30 M44 38 L49 29', '#cfdcc0')
    + `<circle cx="13" cy="29" r="3.4" fill="#e03131" stroke="${INK}" stroke-width="2"/>`
    + `<circle cx="49" cy="27" r="3.4" fill="#e03131" stroke="${INK}" stroke-width="2"/>`,
  ),
  /** Moss: a soft green mound of little star-shaped tufts, with two thin stalks carrying spore capsules. */
  moss: svg(
    shape('M6 54 C6 40 18 32 32 32 C46 32 58 40 58 54 Z', '#5c940d')
    + line('M16 49 l0 -5 m0 2 l-3 -3 m3 3 l3 -3 M26 44 l0 -5 m0 2 l-3 -3 m3 3 l3 -3 M38 45 l0 -5 m0 2 l-3 -3 m3 3 l3 -3 M48 51 l0 -5 m0 2 l-3 -3 m3 3 l3 -3 M22 53 l0 -5 m0 2 l-3 -3 m3 3 l3 -3 M33 52 l0 -5 m0 2 l-3 -3 m3 3 l3 -3 M44 40 l0 -5 m0 2 l-3 -3 m3 3 l3 -3', '#c0eb75', 1.8)
    + line('M24 34 C23 26 22 20 20 14 M40 34 C41 25 43 19 45 12', INK, 2)
    + shape('M17 10 C17 7 21 6 22 9 L23 15 C21 17 18 16 18 14 Z', '#a0522d', 2)
    + shape('M43 8 C44 5 48 5 48 8 L47 14 C45 16 42 15 43 13 Z', '#a0522d', 2),
  ),
  /** Shelf: half-round brackets with stripes of colour, growing out of a log. */
  shelf: svg(
    shape('M6 8 L20 8 L20 58 L6 58 Z', '#8d6e52')
    + line('M10 14 L10 26 M15 32 L15 46 M10 40 L10 52', '#5d4535', 2)
    + shape('M20 20 C30 14 48 16 54 26 C46 30 30 30 20 30 Z', '#b5651d')
    + line('M22 24 C32 20 44 21 50 26', '#f1d7a8', 2.2)
    + shape('M20 38 C28 33 42 34 47 42 C40 46 28 46 20 46 Z', '#c98b4b')
    + line('M22 42 C30 38 39 39 44 42', '#f1d7a8', 2.2),
  ),
  /** Puffball: a round, pale ball on the ground, with a little puff of spores from the hole on top. */
  puffball: svg(
    line('M6 56 L58 56', INK, 2.6)
    + shape('M32 22 C46 22 54 32 54 42 C54 51 46 56 32 56 C18 56 10 51 10 42 C10 32 18 22 32 22 Z', '#f1e6cf')
    + `<ellipse cx="32" cy="24" rx="4" ry="2" fill="#8d6e52" stroke="${INK}" stroke-width="1.8"/>`
    + `<circle cx="22" cy="38" r="1.5" fill="#c9b48f"/><circle cx="40" cy="34" r="1.5" fill="#c9b48f"/><circle cx="30" cy="46" r="1.5" fill="#c9b48f"/><circle cx="44" cy="46" r="1.5" fill="#c9b48f"/>`
    + `<circle cx="29" cy="15" r="2" fill="#a68a64"/><circle cx="35" cy="11" r="2.4" fill="#a68a64"/><circle cx="31" cy="6" r="1.6" fill="#a68a64"/>`,
  ),
  /** Wetland: cattails standing in water. */
  wetland: svg(
    shape('M4 48 C14 44 22 52 32 48 C42 44 50 52 60 48 L60 60 L4 60 Z', '#4dabf7')
    + line('M10 54 C16 52 20 56 26 54 M36 54 C42 52 46 56 52 54', '#d0ebff', 1.8)
    + stem('M18 48 L18 14', '#69a83a', 2.4)
    + stem('M32 48 L32 8', '#69a83a', 2.4)
    + stem('M46 48 L46 18', '#69a83a', 2.4)
    + shape('M15 18 C15 15 21 15 21 18 L21 30 C21 33 15 33 15 30 Z', '#7a4a24')
    + shape('M29 12 C29 9 35 9 35 12 L35 26 C35 29 29 29 29 26 Z', '#7a4a24')
    + shape('M43 22 C43 19 49 19 49 22 L49 33 C49 36 43 36 43 33 Z', '#7a4a24')
    + stem('M25 48 C24 38 22 32 20 26', '#69a83a', 2)
    + stem('M39 48 C40 38 43 33 47 30', '#69a83a', 2),
  ),
};

/** The ids of every drawing, for the test. */
export const KIND_ART_IDS = Object.keys(ART);

/** A kind's drawing as markup, or undefined if there is none. */
export function kindArt(id: string | undefined): string | undefined {
  return id ? ART[id] : undefined;
}

import type { CategoryId } from './types.ts';
import { TYPO_WHEN_FEWER, prepare, prepareQuery, typoDistanceTo, type Prepared } from './typos.ts';
import { nicknamesOf } from './nicknames.ts';

/** One species an explorer can name, from a list (ACCDC via Field Mapper, or imported). */
export interface Species {
  /** Common name. */
  n: string;
  /** Scientific name. */
  s?: string;
  /** Taxon, in Field Mapper's words: Bird, Mammal, Vascular Plant, Lichen… */
  t: string;
  /** ACCDC element code. */
  c?: string;
  /** Subnational (provincial) rank, e.g. S5. */
  r?: string;
  /** Status under the province's Endangered Species Act (Field Mapper's `sprot`): Endangered, Threatened… */
  p?: string;
  /** Status under Canada's Species at Risk Act (Field Mapper's `nprotSar`): E, T, SC. */
  f?: string;
  /** Not native here. */
  x?: boolean;
  /** The province its ranks are for, set when the list is loaded (speciesStore.ts); never stored in a list file. */
  w?: string;
  /**
   * One of Scout's own built-in sets rather than a species list (builtIns.ts), by everyday name: `sea` a sea or shore
   * animal (seaLife.ts), `home` a houseplant (houseplants.ts), `away` an animal wild somewhere else and `pet` a pet or
   * farm animal (farAnimals.ts). Absent = a species from a list.
   */
  o?: BuiltInSet;
  /** An emoji that pictures it (built-in sets); absent = its set's. */
  e?: string;
  /** Its kind, where a built-in set says so whatever its taxon (a lobster is a Sea animal); absent = read from the taxon. */
  k?: CategoryId;
}

export type BuiltInSet = 'sea' | 'home' | 'away' | 'pet';

/**
 * How each built-in set is said: its tab on the name step, the emoji a name without one of its own gets, the words
 * beside a search result in place of the taxon, the set's name in the grown-up corner, and how many of it the name
 * step shows as big buttons before ➕ More (absent = all).
 */
export const SET_WORDS: Readonly<Record<BuiltInSet, { tab: string; emoji: string; pic: string; tag: string; list: string; chips?: number }>> = {
  sea: { tab: 'Sea & shore', emoji: '🌊', pic: '🌊', tag: 'Sea or shore animal', list: 'Sea and shore animals' },
  home: { tab: 'Houseplants', emoji: '🪴', pic: '🪴', tag: 'Houseplant', list: 'Houseplants', chips: 24 },
  away: { tab: 'Far away', emoji: '🌍', pic: '🐾', tag: 'From far away', list: 'Animals from far away' },
  pet: { tab: 'Pets & farm', emoji: '🐶', pic: '🐾', tag: 'Pet or farm animal', list: 'Pets and farm animals' },
};

/** The order the sets' tabs come in, after the wild ones of the find's kind. */
export const SET_ORDER: readonly BuiltInSet[] = ['sea', 'home', 'away', 'pet'];

/**
 * Which taxa answer "what is it?" for each kind of find. Absent = no species step: a habitat is a place, not a species,
 * and asks "What kind of place?" instead (habitats.ts) — water too, since 2.10 (a fish or a frog is an animal find).
 */
export const CATEGORY_TAXA: Partial<Record<CategoryId, string[]>> = {
  bird: ['Bird'],
  animal: ['Mammal', 'Amphibian', 'Reptile', 'Fish'],
  mammal: ['Mammal'],
  amphibian: ['Amphibian'],
  reptile: ['Reptile'],
  fish: ['Fish'],
  snail: ['Mollusc'],
  sea: ['Crustacean', 'Mollusc', 'Echinoderm', 'Cnidarian'],
  sign: ['Mammal', 'Bird', 'Amphibian', 'Reptile'],
  bug: ['Insect', 'Arthropod', 'Crustacean', 'Invertebrate'],
  plant: ['Vascular Plant', 'Fern / Fern Ally', 'Conifer', 'Moss', 'Liverwort', 'Hornwort'],
  tree: ['Conifer', 'Vascular Plant'],
  shrub: ['Vascular Plant', 'Conifer'],
  flower: ['Vascular Plant'],
  fern: ['Fern / Fern Ally'],
  moss: ['Moss', 'Liverwort', 'Hornwort'],
  grass: ['Vascular Plant'],
  houseplant: ['Houseplant'],
  mushroom: ['Fungus'],
  capstem: ['Fungus'],
  shelf: ['Fungus'],
  puffball: ['Fungus'],
  lichen: ['Lichen'],
  crusty: ['Lichen'],
  leafy: ['Lichen'],
  bushy: ['Lichen'],
  mystery: [],
};

/** A mystery and "Other" mean "anything": every taxon. */
export function taxaFor(cat: CategoryId): string[] | null {
  if (cat === 'mystery' || cat === 'other') return null;
  return CATEGORY_TAXA[cat] ?? [];
}

export function hasSpeciesStep(cat: CategoryId): boolean {
  return taxaFor(cat) === null || (CATEGORY_TAXA[cat]?.length ?? 0) > 0;
}

/** Is a species of this taxon one this kind of find names? (A mystery or "Other" names anything.) */
export function belongsTo(cat: CategoryId, taxon: string): boolean {
  const taxa = taxaFor(cat);
  return !taxa || taxa.includes(taxon);
}

/** Commoner first: Scout's own everyday names and S5, then S4, then introduced (SNA) species, then the rest. */
function rankWeight(sp: Species): number {
  const r = sp.r;
  if (sp.o) return 0;
  if (!r) return 3;
  if (r.startsWith('S5')) return 0;
  if (r.startsWith('S4')) return 1;
  if (r.startsWith('SNA')) return 2;
  return 3;
}

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Each species' name and scientific name folded once, and made ready for typo matching once (typos.ts), then kept for
 * as long as the species record lives: a search runs on every keystroke over six thousand names.
 */
interface Folded {
  n: string;
  s: string;
  tn?: Prepared;
  ts?: Prepared | null;
  /** Its nicknames (nicknames.ts), as written and folded, and made ready for typo matching. */
  kd?: string[];
  k?: string[];
  /** Named by the nickname (a headline member of its group), not just caught by its rule. */
  kn?: boolean[];
  tk?: Prepared[];
}
const foldedCache = new WeakMap<Species, Folded>();
function folded(sp: Species): Folded {
  let f = foldedCache.get(sp);
  if (!f) { f = { n: fold(sp.n), s: fold(sp.s ?? '') }; foldedCache.set(sp, f); }
  return f;
}
function nicks(sp: Species, f: Folded): string[] {
  if (!f.k) {
    const all = nicknamesOf(sp);
    f.kd = all.map(x => x.nick);
    f.kn = all.map(x => x.named);
    f.k = f.kd.map(fold);
  }
  return f.k;
}
/** Where a search falls in a name: 0 at the start of a word, 2 inside one, undefined not at all. */
const place = (text: string, q: string) => text.startsWith(q) || text.includes(` ${q}`) ? 0 : text.includes(q) ? 2 : undefined;

/**
 * Species matching what was typed, from the WHOLE list: a find's kind does not limit what can be named (a child who
 * picked Plant and types "turkey tail" finds the mushroom; capture.ts then offers to change the kind). A name starting
 * with the words beats one merely containing them; within that, the find's own kind first, and the very name typed
 * first in it ("cat" is Cat before Feral Cat); then commoner first; then the shorter name. A nickname counts as a name
 * ("ladybug" finds the lady beetles, nicknames.ts), and a misspelt name is still found (typos.ts).
 */
export function searchSpecies(list: Species[], cat: CategoryId, query: string, limit = 40): Species[] {
  const q = fold(query.trim());
  const scored: [number, Species][] = [];
  const misses: Species[] = [];
  for (const sp of list) {
    const { n, s } = folded(sp);
    let score: number;
    let named = n;
    // A nickname (nicknames.ts: "ladybug" for the lady beetles) counts as a name.
    let behind = 0;
    if (!q) score = 10;
    else if (n.startsWith(q) || n.includes(` ${q}`)) score = 0;
    else if (s.startsWith(q)) score = 1;
    else if (n.includes(q) || s.includes(q)) score = 2;
    else {
      const k = nicks(sp, folded(sp));
      const at = k.map(x => place(x, q));
      const best = Math.min(...at.map(x => x ?? Infinity));
      if (best === Infinity) { misses.push(sp); continue; }
      score = best;
      const i = at.findIndex(x => x === best);
      // A member the nickname names (the Seven-spotted Lady Beetle for "ladybug") ranks with a name; the rest of its
      // group a few steps behind.
      behind = folded(sp).kn![i] ? 0 : 4;
      named = k[i];
    }
    // The very name typed edges ahead within its kind, never past the find's own kind: a child under Shelf typing
    // "turkey" on the way to Turkey Tail still sees Turkey Tail before the farm Turkey.
    const exact = q && named === q ? 5 : 0;
    scored.push([score * 20 + (belongsTo(cat, sp.t) ? 0 : 10) + rankWeight(sp) + behind - exact, sp]);
  }
  // Misspelt? When the exact matches are few, names a typo or two away join them (typos.ts): "ferrox" finds the Ferox
  // Begonia, "lobstr" the American Lobster. One of the find's own kind a typo away comes after its exact matches and
  // before other kinds' ("robbin" on a Bird find is American Robin before Robbins' Pondweed); others' come last.
  const pq = q ? prepareQuery(q) : undefined;
  if (pq?.max && scored.length < TYPO_WHEN_FEWER) {
    for (const sp of misses) {
      const f = folded(sp);
      f.tn ??= prepare(f.n);
      if (f.ts === undefined) f.ts = f.s ? prepare(f.s) : null;
      f.tk ??= nicks(sp, f).map(prepare);
      const dn = typoDistanceTo(pq, f.tn), ds = f.ts ? typoDistanceTo(pq, f.ts) : undefined;
      const dks = f.tk.map(t => typoDistanceTo(pq, t) ?? Infinity);
      const dk = Math.min(...dks);
      const d = Math.min(dn ?? Infinity, ds ?? Infinity, dk);
      if (d === Infinity) continue;
      // Found only through a nickname that names it ("lady bug" → the Seven-spotted Lady Beetle)? Ahead of its group.
      const named = d === dk && dn !== d && ds !== d && f.kn!.some((kn, i) => kn && dks[i] === d) ? 4 : 0;
      scored.push([d * 5 + (belongsTo(cat, sp.t) ? 0 : 30) + rankWeight(sp) - named, sp]);
    }
  }
  // Equal matches: the shorter name first, so a plant comes before its named varieties (Spider Plant, then Bonnie
  // Spider Plant), then A to Z.
  scored.sort((a, b) => a[0] - b[0] || a[1].n.length - b[1].n.length || a[1].n.localeCompare(b[1].n));
  return scored.slice(0, limit).map(x => x[1]);
}

/**
 * The nickname that found a search result, to show beside it ("Also called Ladybug"), or undefined when its own name
 * or scientific name did (so "Seven-spotted Lady Beetle" found by "lady" says nothing more).
 */
export function nicknameFound(sp: Species, query: string): string | undefined {
  const q = fold(query.trim());
  if (!q) return undefined;
  const f = folded(sp);
  if (f.n.includes(q) || f.s.includes(q)) return undefined;
  const k = nicks(sp, f);
  const hit = k.findIndex(x => x.includes(q));
  if (hit >= 0) return f.kd![hit];
  const pq = prepareQuery(q);
  if (!pq.max) return undefined;
  f.tn ??= prepare(f.n);
  if (typoDistanceTo(pq, f.tn) !== undefined) return undefined;
  f.tk ??= k.map(prepare);
  const typo = f.tk.findIndex(t => typoDistanceTo(pq, t) !== undefined);
  return typo >= 0 ? f.kd![typo] : undefined;
}

/** Field Mapper's species files are ACCDC records; this reads one, or refuses with a reason. */
export function parseFieldMapperList(json: unknown): Species[] | string {
  if (!Array.isArray(json)) return 'That file is not a species list (it should be a list of species).';
  const out: Species[] = [];
  for (const r of json) {
    if (!r || typeof r !== 'object') continue;
    const rec = r as Record<string, unknown>;
    const n = typeof rec.commonName === 'string' ? rec.commonName.trim() : typeof rec.n === 'string' ? rec.n.trim() : '';
    const t = typeof rec.taxon === 'string' ? rec.taxon : typeof rec.t === 'string' ? rec.t : '';
    if (!n || !t) continue;
    const s = typeof rec.scientificName === 'string' ? rec.scientificName : typeof rec.s === 'string' ? rec.s : undefined;
    const c = typeof rec.elcode === 'string' ? rec.elcode : typeof rec.c === 'string' ? rec.c : undefined;
    const rank = typeof rec.srank === 'string' ? rec.srank : typeof rec.r === 'string' ? rec.r : undefined;
    const prov = typeof rec.sprot === 'string' ? rec.sprot : typeof rec.p === 'string' ? rec.p : undefined;
    const sara = typeof rec.nprotSar === 'string' ? rec.nprotSar : typeof rec.f === 'string' ? rec.f : undefined;
    const x = rec.noteRank === 'Exotic' || rec.x === true;
    out.push({ n: n.slice(0, 120), t: t.slice(0, 40), ...(s ? { s: s.slice(0, 120) } : {}), ...(c ? { c } : {}), ...(rank ? { r: rank.slice(0, 40) } : {}),
      ...(prov ? { p: prov.slice(0, 40) } : {}), ...(sara ? { f: sara.slice(0, 10) } : {}), ...(x ? { x: true } : {}) });
  }
  return out.length ? out : 'No species with a name and a taxon were found in that file.';
}

/** A simple CSV: common name, scientific name, taxon (a header row is optional). */
export function parseSpeciesCsv(text: string): Species[] | string {
  const rows = text.split(/\r?\n/).map(l => splitCsv(l)).filter(r => r.some(c => c.trim()));
  if (rows.length && /common/i.test(rows[0][0] ?? '')) rows.shift();
  const out = rows.filter(r => r[0]?.trim()).map(r => ({
    n: r[0].trim().slice(0, 120),
    ...(r[1]?.trim() ? { s: r[1].trim().slice(0, 120) } : {}),
    t: (r[2]?.trim() || 'Other').slice(0, 40),
  }));
  return out.length ? out : 'No species were found in that file.';
}

function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

/** Folds duplicates (same common + scientific name) keeping the first; lists merge in order. */
export function mergeLists(...lists: Species[][]): Species[] {
  const seen = new Set<string>();
  const out: Species[] = [];
  for (const l of lists) for (const sp of l) {
    const k = `${fold(sp.n)}|${fold(sp.s ?? '')}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(sp);
  }
  return out;
}

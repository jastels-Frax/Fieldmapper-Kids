import type { CategoryId } from './types.ts';

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
  /** Not native here. */
  x?: boolean;
}

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
  sign: ['Mammal', 'Bird', 'Amphibian', 'Reptile'],
  bug: ['Insect', 'Arthropod', 'Crustacean', 'Invertebrate'],
  plant: ['Vascular Plant', 'Fern / Fern Ally', 'Conifer', 'Moss', 'Liverwort', 'Hornwort'],
  tree: ['Conifer', 'Vascular Plant'],
  shrub: ['Vascular Plant', 'Conifer'],
  flower: ['Vascular Plant'],
  fern: ['Fern / Fern Ally'],
  moss: ['Moss', 'Liverwort', 'Hornwort'],
  grass: ['Vascular Plant'],
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

/** Commoner first: S5, S4, then introduced (SNA) species, then the rest. */
function rankWeight(r?: string): number {
  if (!r) return 3;
  if (r.startsWith('S5')) return 0;
  if (r.startsWith('S4')) return 1;
  if (r.startsWith('SNA')) return 2;
  return 3;
}

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Species matching what was typed, from the WHOLE list: a find's kind does not limit what can be named (a child who
 * picked Plant and types "turkey tail" finds the mushroom; capture.ts then offers to change the kind). A name starting
 * with the words beats one merely containing them; within that, the find's own kind first; then commoner first.
 */
export function searchSpecies(list: Species[], cat: CategoryId, query: string, limit = 40): Species[] {
  const q = fold(query.trim());
  const scored: [number, Species][] = [];
  for (const sp of list) {
    const n = fold(sp.n), s = fold(sp.s ?? '');
    let score: number;
    if (!q) score = 10;
    else if (n.startsWith(q) || n.includes(` ${q}`)) score = 0;
    else if (s.startsWith(q)) score = 1;
    else if (n.includes(q) || s.includes(q)) score = 2;
    else continue;
    scored.push([score * 20 + (belongsTo(cat, sp.t) ? 0 : 10) + rankWeight(sp.r), sp]);
  }
  scored.sort((a, b) => a[0] - b[0] || a[1].n.localeCompare(b[1].n));
  return scored.slice(0, limit).map(x => x[1]);
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
    const x = rec.noteRank === 'Exotic' || rec.x === true;
    out.push({ n: n.slice(0, 120), t: t.slice(0, 40), ...(s ? { s: s.slice(0, 120) } : {}), ...(c ? { c } : {}), ...(rank ? { r: rank } : {}), ...(x ? { x: true } : {}) });
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

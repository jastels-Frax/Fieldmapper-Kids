import type { Species } from './species.ts';
import { mergeLists } from './species.ts';
import { allSpeciesLists } from './storage.ts';

/**
 * The species a find can be named from: the Nova Scotia list copied from Field
 * Mapper (public/species/ns.json, precached) plus any list a grown-up imported.
 * Loaded on first use and kept for the session; `invalidate` after an import.
 */
let cache: Promise<{ list: Species[]; source: string }> | null = null;

/** Field Mapper's ACCDC regions, by the code a list file carries. */
const REGION_NAMES: Record<string, string> = {
  ns: 'Nova Scotia', nb: 'New Brunswick', pe: 'Prince Edward Island', nl: 'Newfoundland', lb: 'Labrador',
};

export function loadSpecies(): Promise<{ list: Species[]; source: string }> {
  cache ??= (async () => {
    let base: Species[] = [];
    let source = '';
    try {
      const res = await fetch('./species/ns.json');
      if (res.ok) {
        const doc = (await res.json()) as { species: Species[]; source?: string; region?: string };
        // Its ranks are this province's (rarity.ts says "rare in Nova Scotia"); an imported list's could be any.
        const where = REGION_NAMES[doc.region ?? ''];
        base = where ? (doc.species ?? []).map(sp => ({ ...sp, w: where })) : doc.species ?? [];
        source = doc.source ?? '';
      }
    } catch { /* offline before the first load: imported lists still work */ }
    const imported = await allSpeciesLists().catch(() => []);
    return { list: mergeLists(...imported.map(l => l.species), base), source };
  })();
  return cache;
}

export function invalidateSpecies(): void {
  cache = null;
}

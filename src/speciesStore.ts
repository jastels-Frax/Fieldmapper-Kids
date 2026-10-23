import type { Species } from './species.ts';
import { mergeLists } from './species.ts';
import { allSpeciesLists } from './storage.ts';

/**
 * The species a find can be named from: the Nova Scotia list copied from Field
 * Mapper (public/species/ns.json, precached) plus any list a grown-up imported.
 * Loaded on first use and kept for the session; `invalidate` after an import.
 */
let cache: Promise<{ list: Species[]; source: string }> | null = null;

export function loadSpecies(): Promise<{ list: Species[]; source: string }> {
  cache ??= (async () => {
    let base: Species[] = [];
    let source = '';
    try {
      const res = await fetch('./species/ns.json');
      if (res.ok) {
        const doc = (await res.json()) as { species: Species[]; source?: string };
        base = doc.species ?? [];
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

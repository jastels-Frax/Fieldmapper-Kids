import type { CategoryId } from './types.ts';
import { CATEGORY_TAXA, belongsTo, type Species } from './species.ts';
import { FAMILIAR } from './familiar.ts';
import { groupOf } from './categories.ts';

/**
 * Which kind of find a species is, read from its taxon: the answer to "this is a Turkey Tail, so is it a mushroom?"
 * when a species from outside the find's kind is picked (capture.ts asks before changing anything). Pure.
 */

/** The kind each list taxon is, when nothing more is known about the species. A taxon not here gets no question. */
export const TAXON_KIND: Readonly<Record<string, CategoryId>> = {
  Bird: 'bird', Mammal: 'mammal', Amphibian: 'amphibian', Reptile: 'reptile', Fish: 'fish', Mollusc: 'snail',
  Insect: 'bug', Arthropod: 'bug', Crustacean: 'bug', Invertebrate: 'bug',
  'Vascular Plant': 'plant', Conifer: 'tree', 'Fern / Fern Ally': 'fern', Moss: 'moss', Liverwort: 'moss', Hornwort: 'moss',
  Fungus: 'mushroom', Lichen: 'lichen',
};

/**
 * A species' kind: the most particular kind in its group that names it among its familiar species (Red Maple → tree,
 * Turkey Tail → shelf, Map Lichen → crusty), else the kind of its taxon (an unfamiliar flowering plant → plant).
 */
export function kindForSpecies(sp: Pick<Species, 'n' | 't'>): CategoryId | undefined {
  const base = TAXON_KIND[sp.t];
  if (!base) return undefined;
  const group = groupOf(base);
  for (const k of group?.kinds ?? []) {
    if (k === group!.generic) continue;
    if (CATEGORY_TAXA[k]?.includes(sp.t) && FAMILIAR[k]?.includes(sp.n)) return k;
  }
  return base;
}

/**
 * The kind to offer when a species is picked for a find of kind `cat`: undefined when the species belongs there
 * (a Red Fox for an animal or a track), or when its taxon names no kind. A mystery or "Other" find is offered the
 * species' kind: once it has a name, it is no longer a mystery.
 */
export function kindToOffer(cat: CategoryId, sp: Pick<Species, 'n' | 't'>): CategoryId | undefined {
  if (cat !== 'mystery' && cat !== 'other' && belongsTo(cat, sp.t)) return undefined;
  const k = kindForSpecies(sp);
  return k && k !== cat ? k : undefined;
}

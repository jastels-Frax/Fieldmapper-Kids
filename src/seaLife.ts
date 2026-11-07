import type { Species } from './species.ts';

/**
 * Sea and shore animals of Nova Scotia that a child meets on a beach, in a tide pool or on a wharf: lobsters, crabs,
 * shells, sea stars, jellyfish. public/species/ns.json (ACCDC through Field Mapper) carries almost no sea animals —
 * only the Atlantic Mud-piddock — so "lobster" found nothing but the Lobster Mushroom before 2.16. Pure data, tested
 * (test/builtIns.test.ts).
 *
 * Compiled for Scout from general knowledge, not taken from a published list. A scientific name is given only where
 * the name is one species; a name that covers several (Hermit Crab, Sea Star) has none. None carries a rank or a
 * status, so none is ever rare. Each is a Sea animal (`k: 'sea'`) whatever its taxon, so a lobster is never offered
 * as "a kind of bug". `x` marks the two brought here from Europe.
 */
type Row = [name: string, scientific: string, taxon: string, emoji?: string, introduced?: true];

const ROWS: Row[] = [
  ['American Lobster', 'Homarus americanus', 'Crustacean', '🦞'],
  ['Atlantic Rock Crab', 'Cancer irroratus', 'Crustacean', '🦀'],
  ['Jonah Crab', 'Cancer borealis', 'Crustacean', '🦀'],
  ['European Green Crab', 'Carcinus maenas', 'Crustacean', '🦀', true],
  ['Hermit Crab', '', 'Crustacean', '🦀'],
  ['Northern Rock Barnacle', 'Semibalanus balanoides', 'Crustacean'],
  ['Beach Hopper', '', 'Crustacean'],
  ['Blue Mussel', 'Mytilus edulis', 'Mollusc', '🐚'],
  ['Soft-shell Clam', 'Mya arenaria', 'Mollusc', '🐚'],
  ['Atlantic Sea Scallop', 'Placopecten magellanicus', 'Mollusc', '🐚'],
  ['Eastern Oyster', 'Crassostrea virginica', 'Mollusc', '🦪'],
  ['Common Periwinkle', 'Littorina littorea', 'Mollusc', '🐚', true],
  ['Dog Whelk', 'Nucella lapillus', 'Mollusc', '🐚'],
  ['Northern Moon Snail', 'Euspira heros', 'Mollusc', '🐚'],
  ['Sea Star', '', 'Echinoderm', '⭐'],
  ['Green Sea Urchin', 'Strongylocentrotus droebachiensis', 'Echinoderm'],
  ['Sand Dollar', 'Echinarachnius parma', 'Echinoderm'],
  ['Sea Cucumber', '', 'Echinoderm'],
  ['Moon Jelly', 'Aurelia aurita', 'Cnidarian'],
  ["Lion's Mane Jellyfish", 'Cyanea capillata', 'Cnidarian'],
  ['Frilled Anemone', 'Metridium senile', 'Cnidarian'],
];

export const SEA_LIFE: readonly Species[] = ROWS.map(([n, s, t, e, intro]) => ({
  n, t, o: 'sea' as const, k: 'sea' as const, ...(s ? { s } : {}), ...(e ? { e } : {}), ...(intro ? { x: true } : {}),
}));

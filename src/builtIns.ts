import type { Species } from './species.ts';
import { SEA_LIFE } from './seaLife.ts';
import { HOUSEPLANTS } from './houseplants.ts';
import { FAR_ANIMALS } from './farAnimals.ts';

/**
 * Scout's own names, beside the species lists: sea and shore animals, houseplants, and animals that are not wild here
 * (`Species.o` says which set). Built into the app, so they work before the province's list has ever loaded. Merged
 * after the province's list and any imported one (speciesStore.ts), so a list's own entry always wins. Pure.
 */
export const BUILT_IN: readonly Species[] = [...SEA_LIFE, ...HOUSEPLANTS, ...FAR_ANIMALS];

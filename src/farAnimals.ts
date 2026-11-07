import type { Species } from './species.ts';

/**
 * Animals that are not wild in Nova Scotia, by their everyday names: the kangaroo at the zoo, the dog next door, the
 * cow at the farm. public/species/ns.json is the province's wild species (ACCDC through Field Mapper), so none of these
 * could be named before 2.15 except in the explorer's own words. Pure data, tested (test/farAnimals.test.ts).
 *
 * Not species-level on purpose: "Kangaroo" stands for every kangaroo, so no record carries a scientific name, a rank
 * or a status (they are never rare: rarity.ts reads only the list's ranks and statuses). Every name is one ns.json does
 * not carry, so a child never sees two of one name, and every animal named "far away" is not wild here (the list's
 * introduced animals — House Sparrow, Feral Cat, Red-eared Slider, Goldfish — stay the list's).
 */

type Row = [name: string, taxon: string, emoji?: string];

/** Wild somewhere else: met at a zoo, an aquarium, a farm park or in a book. */
const AWAY: Row[] = [
  // Mammals
  ['Kangaroo', 'Mammal', '🦘'], ['Wallaby', 'Mammal', '🦘'], ['Koala', 'Mammal', '🐨'], ['Wombat', 'Mammal'],
  ['Platypus', 'Mammal'], ['Elephant', 'Mammal', '🐘'], ['Giraffe', 'Mammal', '🦒'], ['Lion', 'Mammal', '🦁'],
  ['Tiger', 'Mammal', '🐅'], ['Leopard', 'Mammal', '🐆'], ['Cheetah', 'Mammal', '🐆'], ['Jaguar', 'Mammal', '🐆'],
  ['Zebra', 'Mammal', '🦓'], ['Hippopotamus', 'Mammal', '🦛'], ['Rhinoceros', 'Mammal', '🦏'], ['Gorilla', 'Mammal', '🦍'],
  ['Chimpanzee', 'Mammal', '🐒'], ['Orangutan', 'Mammal', '🦧'], ['Monkey', 'Mammal', '🐒'], ['Lemur', 'Mammal'],
  ['Sloth', 'Mammal', '🦥'], ['Anteater', 'Mammal'], ['Armadillo', 'Mammal'], ['Camel', 'Mammal', '🐫'],
  ['Giant Panda', 'Mammal', '🐼'], ['Red Panda', 'Mammal'], ['Polar Bear', 'Mammal', '🐻‍❄️'], ['Grizzly Bear', 'Mammal', '🐻'],
  ['Bison', 'Mammal', '🦬'], ['Meerkat', 'Mammal'], ['Hyena', 'Mammal'], ['Warthog', 'Mammal', '🐗'],
  ['Arctic Fox', 'Mammal', '🦊'], ['Capybara', 'Mammal'], ['Sea Lion', 'Mammal', '🦭'], ['Sea Otter', 'Mammal', '🦦'],
  // Birds
  ['Penguin', 'Bird', '🐧'], ['Flamingo', 'Bird', '🦩'], ['Ostrich', 'Bird'], ['Emu', 'Bird'], ['Peacock', 'Bird', '🦚'],
  ['Parrot', 'Bird', '🦜'], ['Toucan', 'Bird'],
  // Reptiles
  ['Crocodile', 'Reptile', '🐊'], ['Alligator', 'Reptile', '🐊'], ['Komodo Dragon', 'Reptile', '🦎'], ['Iguana', 'Reptile', '🦎'],
  ['Chameleon', 'Reptile', '🦎'], ['Tortoise', 'Reptile', '🐢'], ['Python', 'Reptile', '🐍'], ['Cobra', 'Reptile', '🐍'],
  ['Rattlesnake', 'Reptile', '🐍'],
  // Amphibians
  ['Axolotl', 'Amphibian'], ['Poison Dart Frog', 'Amphibian', '🐸'],
  // Fish
  ['Clownfish', 'Fish', '🐠'], ['Piranha', 'Fish', '🐟'],
  // Bugs
  ['Tarantula', 'Arthropod', '🕷️'], ['Scorpion', 'Arthropod', '🦂'], ['Hissing Cockroach', 'Insect', '🪳'],
  ['Blue Morpho Butterfly', 'Insect', '🦋'],
];

/** Pets and farm animals. */
const PETS: Row[] = [
  ['Dog', 'Mammal', '🐕'], ['Cat', 'Mammal', '🐈'], ['Horse', 'Mammal', '🐎'], ['Pony', 'Mammal', '🐴'], ['Donkey', 'Mammal', '🐴'],
  ['Cow', 'Mammal', '🐄'], ['Pig', 'Mammal', '🐖'], ['Sheep', 'Mammal', '🐑'], ['Goat', 'Mammal', '🐐'], ['Llama', 'Mammal', '🦙'],
  ['Alpaca', 'Mammal', '🦙'], ['Rabbit', 'Mammal', '🐇'], ['Guinea Pig', 'Mammal', '🐹'], ['Hamster', 'Mammal', '🐹'],
  ['Gerbil', 'Mammal'], ['Ferret', 'Mammal'], ['Hedgehog', 'Mammal', '🦔'], ['Chinchilla', 'Mammal'],
  ['Chicken', 'Bird', '🐔'], ['Turkey', 'Bird', '🦃'], ['Farm Duck', 'Bird', '🦆'], ['Budgie', 'Bird', '🦜'],
  ['Cockatiel', 'Bird', '🦜'], ['Canary', 'Bird', '🐤'],
  ['Bearded Dragon', 'Reptile', '🦎'], ['Leopard Gecko', 'Reptile', '🦎'], ['Corn Snake', 'Reptile', '🐍'],
  ['Betta Fish', 'Fish', '🐟'], ['Guppy', 'Fish', '🐟'], ['Koi', 'Fish', '🐟'],
];

const toSpecies = (o: 'away' | 'pet') => ([n, t, e]: Row): Species => ({ n, t, x: true, o, ...(e ? { e } : {}) });

/** Every animal here, far-away ones first. Merged after the province's list and any imported one (speciesStore.ts). */
export const FAR_ANIMALS: readonly Species[] = [...AWAY.map(toSpecies('away')), ...PETS.map(toSpecies('pet'))];

/** How each set is said on its tab and beside a search result. */
export const FAR_WORDS: Readonly<Record<'away' | 'pet', { tab: string; emoji: string; tag: string }>> = {
  away: { tab: 'Far away', emoji: '🌍', tag: 'From far away' },
  pet: { tab: 'Pets & farm', emoji: '🐶', tag: 'Pet or farm animal' },
};

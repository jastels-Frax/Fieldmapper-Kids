import type { CategoryId } from './types.ts';
import { groupOf } from './categories.ts';

/**
 * Kinds of place, for a habitat find: a habitat is not a species, so instead of "What is it called?" the explorer is
 * asked "What kind of place?" and offered these, the way species are offered (capture.ts, the `place` step). The
 * places a child meets in Nova Scotia: the Acadian forest's softwood, hardwood and mixedwood stands, the barrens and
 * blueberry fields, the five wetland classes (bog, fen, marsh, swamp and open water) and the salt marshes, the
 * Fundy mudflats and cliffs, and the everyday places a find is made in (a backyard, a schoolyard). Each `hint` is a
 * plain, true line a child can check against what is in front of them. Pure.
 */
export interface HabitatType {
  name: string;
  /** What it looks like, in a child's words. Searched as well as the name ("cumulus" finds Puffy clouds). */
  hint: string;
  /** The habitat kind it is a kind of (`categories.ts`, group Habitat). */
  kind: CategoryId;
}

export const HABITAT_TYPES: readonly HabitatType[] = [
  // Forest. Nova Scotia is in the Acadian forest region, where stands are softwood, hardwood or both mixed.
  { kind: 'forest', name: 'Softwood forest', hint: 'Spruce, fir, pine or hemlock' },
  { kind: 'forest', name: 'Hardwood forest', hint: 'Maple, birch and beech' },
  { kind: 'forest', name: 'Mixedwood forest', hint: 'Softwood and hardwood trees together' },
  { kind: 'forest', name: 'Old forest', hint: 'Big old trees and fallen logs' },
  { kind: 'forest', name: 'Young forest', hint: 'Small trees growing back' },
  { kind: 'forest', name: 'Hemlock grove', hint: 'Tall, shady hemlock trees' },
  { kind: 'forest', name: 'Coastal forest', hint: 'Spruce and fir by the sea, bent by the wind' },
  { kind: 'forest', name: 'Floodplain forest', hint: 'Trees beside a river that floods' },
  // Meadow and other open ground.
  { kind: 'meadow', name: 'Meadow', hint: 'Tall grass and wildflowers' },
  { kind: 'meadow', name: 'Old field', hint: 'A farm field growing wild again' },
  { kind: 'meadow', name: 'Hayfield', hint: 'Grass grown to cut for hay' },
  { kind: 'meadow', name: 'Pasture', hint: 'Grass where farm animals eat' },
  { kind: 'meadow', name: 'Blueberry field', hint: 'Low wild blueberry bushes' },
  { kind: 'meadow', name: 'Barrens', hint: 'Low shrubs, rocks and few trees' },
  { kind: 'meadow', name: 'Coastal barrens', hint: 'Low shrubs and rock by the sea' },
  // Wetland: the wetland classes, and two kinds of pond that are really wetlands.
  { kind: 'wetland', name: 'Bog', hint: 'Spongy moss, and the water comes from rain' },
  { kind: 'wetland', name: 'Fen', hint: 'Sedges and moss, fed by water from the ground' },
  { kind: 'wetland', name: 'Marsh', hint: 'Cattails and grasses in shallow water' },
  { kind: 'wetland', name: 'Swamp', hint: 'Trees or shrubs growing in wet ground' },
  { kind: 'wetland', name: 'Salt marsh', hint: 'Grass the sea floods at high tide' },
  { kind: 'wetland', name: 'Beaver pond', hint: 'Water held back by a beaver dam' },
  { kind: 'wetland', name: 'Vernal pool', hint: 'A spring pool that dries up in summer' },
  // Water.
  { kind: 'water', name: 'Lake', hint: 'Big, still water' },
  { kind: 'water', name: 'Pond', hint: 'Smaller and shallower than a lake' },
  { kind: 'water', name: 'River', hint: 'Big running water' },
  { kind: 'water', name: 'Brook', hint: 'Small running water, a stream' },
  { kind: 'water', name: 'Waterfall', hint: 'Water falling over rock' },
  { kind: 'water', name: 'Spring', hint: 'Water coming up out of the ground' },
  { kind: 'water', name: 'Estuary', hint: 'Where a river meets the sea' },
  { kind: 'water', name: 'Ocean', hint: 'Salty sea water' },
  { kind: 'water', name: 'Tide pool', hint: 'Sea water left in the rocks when the tide goes out' },
  { kind: 'water', name: 'Puddle', hint: 'Rain water on the ground' },
  // Beach and shore.
  { kind: 'beach', name: 'Sand beach', hint: 'Soft sand by the water' },
  { kind: 'beach', name: 'Pebble beach', hint: 'Round stones the waves have rolled' },
  { kind: 'beach', name: 'Rocky shore', hint: 'Big rocks where the waves splash' },
  { kind: 'beach', name: 'Sand dunes', hint: 'Sand hills held by marram grass' },
  { kind: 'beach', name: 'Mudflat', hint: 'Mud the sea uncovers at low tide' },
  { kind: 'beach', name: 'Sea cliff', hint: 'A steep rock wall above the sea' },
  // Rock.
  { kind: 'rock', name: 'Bedrock', hint: 'Solid rock that is part of the ground' },
  { kind: 'rock', name: 'Big boulder', hint: 'A huge rock, maybe left by a glacier' },
  { kind: 'rock', name: 'Cliff', hint: 'A steep wall of rock' },
  { kind: 'rock', name: 'Rocky slope', hint: 'A hill of loose rocks' },
  { kind: 'rock', name: 'Cave', hint: 'A hole in the rock. Never go in without a grown-up' },
  { kind: 'rock', name: 'Stone wall', hint: 'Rocks piled up by people' },
  // Sky.
  { kind: 'sky', name: 'Clear blue sky', hint: 'No clouds at all' },
  { kind: 'sky', name: 'Puffy clouds', hint: 'White and fluffy, called cumulus' },
  { kind: 'sky', name: 'Wispy clouds', hint: 'Thin and high, called cirrus' },
  { kind: 'sky', name: 'Grey blanket clouds', hint: 'Flat and grey, called stratus' },
  { kind: 'sky', name: 'Storm clouds', hint: 'Tall and dark. Go inside if you hear thunder' },
  { kind: 'sky', name: 'Fog', hint: 'A cloud down on the ground' },
  { kind: 'sky', name: 'Rainbow', hint: 'Sunlight shining through rain' },
  { kind: 'sky', name: 'Sunrise or sunset', hint: 'The sky turning orange and pink' },
  { kind: 'sky', name: 'Starry night', hint: 'Stars, the moon and maybe planets' },
  // Everyday places (Another place).
  { kind: 'habitat', name: 'Backyard', hint: 'Behind a house' },
  { kind: 'habitat', name: 'Schoolyard', hint: 'Around a school' },
  { kind: 'habitat', name: 'Park', hint: 'Open ground for everyone' },
  { kind: 'habitat', name: 'Playground', hint: 'Swings and slides' },
  { kind: 'habitat', name: 'Garden', hint: 'Plants people grow' },
  { kind: 'habitat', name: 'Lawn', hint: 'Short, mown grass' },
  { kind: 'habitat', name: 'Orchard', hint: 'Rows of fruit trees' },
  { kind: 'habitat', name: 'Trail', hint: 'A path through nature' },
  { kind: 'habitat', name: 'Roadside', hint: 'The edge of a road. Stay back from cars' },
  { kind: 'habitat', name: 'Campground', hint: 'Where people camp' },
];

/** Does a find of this kind ask "What kind of place?" (instead of a species)? Every kind in the Habitat group. */
export function hasPlaceStep(cat: CategoryId): boolean {
  return groupOf(cat)?.id === 'habitats';
}

/** The kinds of place offered for a kind, as chips before anything is typed. */
export function habitatsFor(cat: CategoryId): HabitatType[] {
  return HABITAT_TYPES.filter(t => t.kind === cat);
}

/** The listed kind of place with this name (any capitals), if there is one: typed "bog" is the listed Bog. */
export function habitatNamed(name: string): HabitatType | undefined {
  const n = name.trim().toLowerCase();
  return n ? HABITAT_TYPES.find(t => t.name.toLowerCase() === n) : undefined;
}

/**
 * Search every kind of place, by name and by hint: a word of the name starting with what was typed first, then the
 * name holding it anywhere, then the hint; within each, the find's own kind first. Like the species search, it is
 * never limited to the find's kind (a forest find can turn out to be a swamp).
 */
export function searchHabitats(q: string, cat: CategoryId, limit = 12): HabitatType[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const scored: { t: HabitatType; score: number }[] = [];
  HABITAT_TYPES.forEach((t, i) => {
    const name = t.name.toLowerCase();
    const tier = name.split(/[\s-]+/).some(w => w.startsWith(s)) ? 0 : name.includes(s) ? 1 : t.hint.toLowerCase().includes(s) ? 2 : -1;
    if (tier < 0) return;
    scored.push({ t, score: tier * 1000 + (t.kind === cat ? 0 : 500) + i });
  });
  return scored.sort((a, b) => a.score - b.score).slice(0, limit).map(x => x.t);
}

/**
 * The kind to offer when a kind of place is picked for a find of kind `cat` ("Bog is a kind of wetland. Make this
 * find Wetland?"): undefined when it already is that kind, and for the everyday places (a backyard can be any of them).
 */
export function habitatKindToOffer(cat: CategoryId, t: HabitatType): CategoryId | undefined {
  return t.kind !== cat && t.kind !== 'habitat' ? t.kind : undefined;
}

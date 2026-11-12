import type { Species } from './species.ts';

/**
 * Everyday names for list species: the words a child (or a grown-up) uses that are not a species' common name.
 * "Ladybug" is the Seven-spotted Lady Beetle and its kin; "butterfly" is every butterfly and skipper on the list,
 * whose own names (Monarch, Cabbage White) never say "butterfly". Typing a nickname finds what it stands for, and the
 * search result says which nickname found it. Pure data and rules, tested (test/nicknames.test.ts).
 *
 * Compiled for Scout from general knowledge, like the built-in names. A nickname points at species by name, or — for a
 * whole group — by what the list itself records: a name ending ("… Lady Beetle"), a scientific genus (Usnea for old
 * man's beard), or an ACCDC element code (IILEP is the butterflies and skippers, IIODO the dragonflies and damselflies).
 * A group's nickname lists the members it brings to mind first, by name. A nickname never stands for something it is not: a "pill bug" rolls into a ball and the list's woodlouse (Porcellio
 * scaber) does not, so "pill bug" is not here, while "sow bug" is.
 */

/** What a nickname stands for: a species by its exact name, or every species matching all of a rule's parts. */
export type Target = string | {
  /** The name contains this (any case). */
  has?: string;
  /** The name ends with one of these. */
  ends?: string[];
  /** …and not with any of these. */
  notEnds?: string[];
  /** The ACCDC element code starts with this. */
  code?: string;
  /** The scientific name starts with this (a genus). */
  sci?: string;
};

/** Damselflies' names in the list end with one of these; every other dragonfly-and-damselfly (IIODO) is a dragonfly. */
const DAMSELS = [' Jewelwing', ' Spreadwing', ' Dancer', ' Bluet', ' Forktail', ' Sprite', ' Damsel'];

export const NICKNAMES: ReadonlyArray<readonly [nickname: string, targets: readonly Target[]]> = [
  // Bugs
  ['Ladybug', ['Seven-spotted Lady Beetle', { ends: [' Lady Beetle'] }]],
  ['Ladybird', ['Seven-spotted Lady Beetle', { ends: [' Lady Beetle'] }]],
  ['Bumblebee', ['Common Eastern Bumble Bee', { ends: [' Bumble Bee'] }]],
  ['Honeybee', ['European Honey Bee']],
  ['Butterfly', ['Monarch', 'Mourning Cloak', 'Cabbage White', 'Canadian Tiger Swallowtail', 'Red Admiral', 'Painted Lady',
    'American Lady', 'Viceroy', 'White Admiral', 'Clouded Sulphur', { code: 'IILEP' }]],
  ['Dragonfly', ['Common Green Darner', { code: 'IIODO', notEnds: DAMSELS }]],
  ['Damselfly', ['Ebony Jewelwing', { code: 'IIODO', ends: DAMSELS }]],
  ['Lightning Bug', [{ has: 'Firefly' }]],
  ['June Bug', [{ has: 'June Beetle' }]],
  ['Woolly Bear', ['Isabella Tiger Moth']],
  ['Daddy Longlegs', [{ has: 'Harvestman' }]],
  ['Sow Bug', ['Common Rough Woodlouse']],
  // Mammals
  ['Groundhog', ['Woodchuck']],
  ['Whistle Pig', ['Woodchuck']],
  ['Weasel', ['American Ermine']],
  ['Bunny', ['Snowshoe Hare', 'Rabbit']],
  ['Kitten', ['Cat']],
  ['Kitty', ['Cat']],
  ['Puppy', ['Dog']],
  ['Lamb', ['Sheep']],
  ['Cattle', ['Cow']],
  // Birds
  ['Seagull', ['Herring Gull', { ends: [' Gull'] }]],
  ['Hen', ['Chicken']],
  ['Rooster', ['Chicken']],
  ['Parakeet', ['Budgie']],
  ['Budgerigar', ['Budgie']],
  // Frogs, newts, snakes, turtles, fish
  ['Red Eft', ['Eastern Newt', 'Red-spotted Newt']],
  ['Garter Snake', [{ ends: [' Gartersnake'] }]],
  ['Snapper', ['Snapping Turtle']],
  ['Minnow', ['Common Shiner', 'Golden Shiner', 'Blacknose Shiner', 'Lake Chub', 'Creek Chub', 'Northern Redbelly Dace',
    'Northern Pearl Dace', 'Eastern Blacknose Dace']],
  // Sea and shore
  ['Starfish', ['Sea Star']],
  ['Jellyfish', ['Moon Jelly', "Lion's Mane Jellyfish"]],
  ['Sea Anemone', ['Frilled Anemone']],
  ['Sand Flea', ['Beach Hopper']],
  // Trees and plants
  ['Christmas Tree', ['Balsam Fir']],
  ['White Birch', ['Paper Birch']],
  ['Larch', ['Tamarack']],
  ['Hackmatack', ['Tamarack']],
  ['Dogberry', ['American Mountain Ash', 'Showy Mountain Ash']],
  ['Rowan', ['European Mountain Ash']],
  ['Mayflower', ['Trailing Arbutus']],
  ['Fiddlehead', ['Ostrich Fern']],
  ['Lily Pad', ['Fragrant Water-lily', 'Small Yellow Pond-lily', 'Variegated Pond-lily']],
  ['Lady Slipper', [{ has: "Lady's-slipper" }]],
  // Lichens (called mosses and beards)
  ['Reindeer Moss', [{ has: 'Reindeer Lichen' }]],
  ["Old Man's Beard", [{ sci: 'Usnea' }, "Methuselah's Beard Lichen"]],
  // Houseplants
  ["Mother-in-law's Tongue", ['Snake Plant']],
  ["Devil's Ivy", ['Pothos', 'Golden Pothos']],
  ['Swiss Cheese Plant', ['Monstera']],
  ['Flamingo Flower', ['Anthurium']],
  ['Succulent', ['Jade Plant', 'Aloe Vera', 'Echeveria', 'Haworthia', "Burro's Tail", 'String of Pearls', 'Panda Plant',
    'Kalanchoe', 'Living Stones', 'Mother of Thousands', 'Zebra Haworthia', 'Gollum Jade', 'String of Bananas']],
];

/** Does this species answer to this target? */
export function matchesTarget(sp: Pick<Species, 'n' | 's' | 'c'>, t: Target): boolean {
  if (typeof t === 'string') return sp.n === t;
  if (t.has && !sp.n.toLowerCase().includes(t.has.toLowerCase())) return false;
  if (t.ends && !t.ends.some(e => sp.n.endsWith(e))) return false;
  if (t.notEnds && t.notEnds.some(e => sp.n.endsWith(e))) return false;
  if (t.code && !(sp.c ?? '').startsWith(t.code)) return false;
  if (t.sci && !(sp.s ?? '').startsWith(t.sci)) return false;
  return true;
}

/**
 * The nicknames a species answers to, as they are written, and whether it is NAMED by one (a string target) rather
 * than caught by a rule. A nickname for a group names the members it brings to mind first (the Seven-spotted Lady
 * Beetle for "ladybug", the Monarch for "butterfly"), and the search lists those before the rest of the group.
 */
export function nicknamesOf(sp: Pick<Species, 'n' | 's' | 'c'>): { nick: string; named: boolean }[] {
  const out: { nick: string; named: boolean }[] = [];
  for (const [nick, targets] of NICKNAMES) {
    if (targets.includes(sp.n)) out.push({ nick, named: true });
    else if (targets.some(t => matchesTarget(sp, t))) out.push({ nick, named: false });
  }
  return out;
}

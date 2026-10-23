import type { CategoryId } from './types.ts';

/**
 * Species a child in Nova Scotia is likely to meet, offered as big buttons
 * before any typing. Every name must be a common name in public/species/ns.json
 * (test/species.test.ts holds them to it), so a tap names a real list entry.
 */
const BIRDS = ['American Robin', 'Black-capped Chickadee', 'Blue Jay', 'American Crow', 'Common Raven', 'Song Sparrow',
  'Dark-eyed Junco', 'American Goldfinch', 'Mourning Dove', 'Herring Gull', 'Bald Eagle', 'Mallard', 'Canada Goose',
  'Ruby-throated Hummingbird', 'Northern Cardinal', 'Great Blue Heron', 'Downy Woodpecker', 'European Starling',
  'House Sparrow', 'Common Loon', 'Ruffed Grouse', 'Barred Owl', 'Rock Pigeon', 'Northern Flicker'];
const MAMMALS = ['Red Squirrel', 'Eastern Chipmunk', 'Snowshoe Hare', 'White-tailed Deer', 'North American Beaver',
  'Common Muskrat', 'North American Porcupine', 'Raccoon', 'Red Fox', 'Striped Skunk', 'Coyote', 'American Black Bear',
  'Moose', 'Woodchuck', 'Eastern Grey Squirrel', 'American Mink', 'Star-nosed Mole', 'Meadow Vole'];
const HERPS = ['Spring Peeper', 'Wood Frog', 'Green Frog', 'American Bullfrog', 'American Toad',
  'Eastern Red-backed Salamander', 'Spotted Salamander', 'Eastern Newt', 'Painted Turtle', 'Snapping Turtle',
  'Maritime Gartersnake', 'Red-bellied Snake'];
const TREES = ['Red Maple', 'Sugar Maple', 'Paper Birch', 'Yellow Birch', 'Balsam Fir', 'Eastern White Pine', 'Red Spruce',
  'White Spruce', 'Black Spruce', 'Eastern Hemlock', 'Trembling Aspen', 'Northern Red Oak', 'American Beech', 'Speckled Alder'];
const FLOWERS = ['Common Dandelion', 'White Clover', 'Red Clover', 'Oxeye Daisy', 'Common Yarrow', 'Fireweed',
  'Purple Loosestrife', 'Common Milkweed', 'Canada Goldenrod', 'Bunchberry', 'Wild Strawberry', 'Coltsfoot',
  "Queen Anne's Lace", 'Rugosa Rose', 'Sheep Laurel', 'Wild Lily-of-The-Valley', 'Painted Trillium'];
const PLANTS = ['Cinnamon Fern', 'Eastern Bracken Fern', 'Broad-leaved Cattail', 'Common Juniper', 'Common Labrador Tea',
  'Partridgeberry', 'British Soldiers Lichen', 'Reindeer Lichen'];
const BUGS = ['Monarch', 'Mourning Cloak', 'Cabbage White', 'Canadian Tiger Swallowtail', 'Red Admiral', 'Painted Lady',
  'American Lady', 'Viceroy', 'White Admiral', 'Clouded Sulphur', 'Common Green Darner', 'Ebony Jewelwing',
  'Seven-spotted Lady Beetle', 'Common Eastern Bumble Bee', 'European Honey Bee'];

export const FAMILIAR: Partial<Record<CategoryId, string[]>> = {
  bird: BIRDS,
  animal: [...MAMMALS, ...HERPS],
  sign: [...MAMMALS, ...BIRDS.slice(0, 8)],
  tree: TREES,
  flower: FLOWERS,
  plant: [...PLANTS, ...TREES.slice(0, 4), ...FLOWERS.slice(0, 4)],
  bug: BUGS,
  water: ['Green Frog', 'Spring Peeper', 'Painted Turtle', 'Snapping Turtle', 'Mallard', 'Common Loon', 'Great Blue Heron', 'Common Green Darner'],
};

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
  'Partridgeberry'];
const SHRUBS = ['Late Lowbush Blueberry', 'Red Raspberry', 'Common Juniper', 'Sheep Laurel', 'Common Labrador Tea', 'Rugosa Rose',
  'Speckled Alder', 'Rhodora', 'Northern Bayberry', 'Common Winterberry'];
const FERNS = ['Cinnamon Fern', 'Eastern Bracken Fern', 'Sensitive Fern', 'Ostrich Fern', 'Interrupted Fern', 'Royal Fern',
  'Eastern Hay-Scented Fern', 'Christmas Fern', 'Field Horsetail'];
const MOSSES = ['Common Haircap Moss', 'Stairstep Moss', 'Red-stemmed Feather Moss'];
const GRASSES = ['Broad-leaved Cattail', 'Reed Canary Grass', 'Common Reed', 'Soft Rush', 'Tussock Sedge'];
const FISH = ['Brook Trout', 'Atlantic Salmon', 'Threespine Stickleback', 'Yellow Perch', 'American Eel', 'Mummichog',
  'Golden Shiner', 'White Sucker', 'Smallmouth Bass', 'Rainbow Smelt'];
const SNAILS = ['Grovesnail', 'White-lip Gardensnail', 'Garlic Glass-snail', 'Giant Gardenslug', 'Grey Fieldslug', 'Black Arion Slug'];
const CAP_STEM = ['Fly Amanita', 'Shaggy Mane', 'Honey Fungus', 'Fairy Ring Mushroom', 'Slippery Jack', 'Common Morel'];
const SHELVES = ['Turkey Tail', 'Chicken of the Woods', "Artist's Bracket", 'Tinder Conk', 'Birch Polypore', 'Oyster Mushroom'];
const PUFFBALLS = ['Giant Puffball', 'Pear-shaped Puffball', 'Common Earthball'];
const CRUSTY = ['Map Lichen', 'Boulder Lichen'];
const LEAFY = ['Lungwort Lichen', 'Hammered Shield Lichen', 'Powdered Ruffle Lichen', 'Granulated Greenshield Lichen', 'Freckled Tube Lichen'];
const BUSHY = ['Bushy Beard Lichen', "Methuselah's Beard Lichen", "Common Witch's Hair Lichen", 'Reindeer Lichen', 'Gray Reindeer Lichen',
  'British Soldiers Lichen', 'Mealy Pixie-cup Lichen'];
const MUSHROOMS = ['Fly Amanita', 'Turkey Tail', 'Chicken of the Woods', "Artist's Bracket", 'Tinder Conk', 'Birch Polypore',
  'Giant Puffball', 'Pear-shaped Puffball', 'Shaggy Mane', 'Honey Fungus', 'Oyster Mushroom', "Witch's Butter",
  'Orange Peel Fungus', "Dead Man's Fingers", 'Common Morel', 'Lobster Mushroom', 'Fairy Ring Mushroom', 'Slippery Jack',
  'Candlesnuff Fungus', 'Common Earthball'];
const BUGS = ['Monarch', 'Mourning Cloak', 'Cabbage White', 'Canadian Tiger Swallowtail', 'Red Admiral', 'Painted Lady',
  'American Lady', 'Viceroy', 'White Admiral', 'Clouded Sulphur', 'Common Green Darner', 'Ebony Jewelwing',
  'Seven-spotted Lady Beetle', 'Common Eastern Bumble Bee', 'European Honey Bee'];

export const FAMILIAR: Partial<Record<CategoryId, string[]>> = {
  bird: BIRDS,
  animal: [...MAMMALS, ...HERPS],
  mammal: MAMMALS,
  amphibian: HERPS.slice(0, 8),
  reptile: HERPS.slice(8),
  fish: FISH,
  snail: SNAILS,
  sign: [...MAMMALS, ...BIRDS.slice(0, 8)],
  tree: TREES,
  flower: FLOWERS,
  plant: [...PLANTS, ...TREES.slice(0, 4), ...FLOWERS.slice(0, 4)],
  shrub: SHRUBS,
  fern: FERNS,
  moss: MOSSES,
  grass: GRASSES,
  bug: BUGS,
  mushroom: MUSHROOMS,
  capstem: CAP_STEM,
  shelf: SHELVES,
  puffball: PUFFBALLS,
  lichen: [...BUSHY.slice(3, 6), ...CRUSTY, ...LEAFY.slice(0, 2), ...BUSHY.slice(0, 2)],
  crusty: CRUSTY,
  leafy: LEAFY,
  bushy: BUSHY,
  water: ['Green Frog', 'Spring Peeper', 'Painted Turtle', 'Snapping Turtle', 'Mallard', 'Common Loon', 'Great Blue Heron', 'Common Green Darner'],
};

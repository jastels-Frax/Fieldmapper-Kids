import type { CategoryId, ColourId, CountId, GroupId, SignId, SizeId } from './types.ts';

export interface Category {
  id: CategoryId;
  emoji: string;
  label: string;
  /** A shorter word where a button is small (the quick-find chips); absent = the label. */
  short?: string;
  colour: string;
  /** Said when the category is picked. */
  cheer: string;
  /** Questions a grown-up and child can talk about (Together mode). */
  talk: string[];
  /** Short true facts to wonder at. */
  facts: string[];
  /** Its group (absent for "Other" and the mystery, which is "not sure" of everything). */
  group?: GroupId;
  /**
   * The older kind it is a kind of: a fern is a plant, a mammal an animal, a shelf a mushroom. Anything counting the
   * older kind counts this one too (`isKind`): badges, hunts and challenges written for "a plant" still tick.
   */
  refines?: CategoryId;
  /** A drawing (kindArt.ts) where no emoji says it: lichens, moss, shelf and puffball mushrooms, wetlands. */
  art?: string;
  /** A few words under the button that help a child choose ("Flat like paint"). */
  hint?: string;
  /** The button's words in its group's list, when not the label ("Just a plant"). */
  pick?: string;
  /** Its whole name where the label leans on its group: "Shelf mushroom" for Shelf. Absent = the label. */
  full?: string;
  /** How one is said after "You found": absent = "a" or "an" and the whole name ("a fern", "a shelf mushroom"). */
  one?: string;
}

export const CATEGORIES: Category[] = [
  {
    id: 'bird', group: 'animals', emoji: '🐦', label: 'Bird', colour: '#4dabf7', cheer: 'A bird! Tweet tweet!',
    talk: ['What sound did it make?', 'Was it flying, walking or sitting?', 'What do you think it eats?'],
    facts: ['Birds are the only animals with feathers.', 'Some birds fly thousands of kilometres every year.', 'A bird\'s bones are hollow, which makes them light.'],
  },
  {
    id: 'bug', group: 'animals', hint: 'Or a spider', emoji: '🐛', label: 'Bug', colour: '#82c91e', cheer: 'A bug! Wiggle wiggle!',
    talk: ['How many legs could you count?', 'Did it have wings?', 'Where do you think it lives?'],
    facts: ['Insects have six legs.', 'Spiders have eight legs, so they are not insects.', 'Caterpillars turn into butterflies or moths.'],
  },
  {
    id: 'plant', group: 'plants', pick: 'Just a plant', emoji: '🌱', label: 'Plant', colour: '#40c057', cheer: 'A plant! So green!',
    talk: ['What shape are the leaves?', 'Is it in the sun or the shade?', 'Do you think it needs a lot of water?'],
    facts: ['Plants make their own food from sunlight.', 'Moss has no flowers or seeds.', 'Some plants, like poison ivy, make skin itchy. Look with your eyes, not your hands.'],
  },
  {
    id: 'tree', group: 'plants', emoji: '🌳', label: 'Tree', colour: '#2b8a3e', cheer: 'A tree! So tall!',
    talk: ['Can you hug all the way around it?', 'What does the bark feel like?', 'Does it have leaves or needles?'],
    facts: ['You can tell a tree\'s age by counting its rings.', 'Trees give us the air we breathe.', 'Some trees live for hundreds of years.'],
  },
  {
    id: 'flower', group: 'plants', emoji: '🌸', label: 'Flower', colour: '#f783ac', cheer: 'A flower! How pretty!',
    talk: ['How many petals does it have?', 'Does it smell?', 'Did you see any bees nearby?'],
    facts: ['Bees carry pollen from flower to flower.', 'Some flowers close up at night.', 'Dandelion seeds fly on tiny parachutes.'],
  },
  {
    id: 'animal', group: 'animals', pick: 'Just an animal', emoji: '🐿️', label: 'Animal', colour: '#e8590c', cheer: 'An animal! Wow! Watch it from far away.',
    talk: ['Was it fast or slow?', 'Did it have fur, scales or skin?', 'Did it see you?'],
    facts: ['Squirrels bury nuts and forget some, which grow into trees.', 'Frogs can breathe through their skin.', 'Watch wild animals from far away. Never touch or feed them.'],
  },
  {
    id: 'mushroom', group: 'mushrooms', pick: 'Another shape', hint: 'Coral, jelly or cups', art: 'coral', emoji: '🍄', label: 'Mushroom', colour: '#c92a2a', cheer: 'A mushroom! Look, but never eat it!',
    talk: ['Is it growing on the ground or on wood?', 'Does it have a cap and a stem, or is it a shelf?', 'Is it slimy, smooth or bumpy?'],
    facts: ['Never eat a wild mushroom. Some look friendly and are poison.', 'A mushroom is just the fruit. The rest of the fungus hides underground or inside wood.', 'Fungi help rot old logs and leaves back into soil.'],
  },
  {
    id: 'sign', group: 'animals', emoji: '🐾', label: 'Tracks & scat', short: 'Tracks', colour: '#a0522d', cheer: 'Animal clues! You are a detective!',
    talk: ['How many toes can you see in the track?', 'Which way was the animal going?', 'What animal do you think left it?'],
    facts: ['Scat is what scientists call animal poop. Look, but never touch it!', 'Deer and moose tracks show two toes; foxes and coyotes show four.', 'A chewed pine cone with the scales pulled off is often a red squirrel\'s lunch.'],
  },
  {
    id: 'rock', group: 'habitats', hint: 'Rocks and cliffs', emoji: '🪨', label: 'Rock', colour: '#868e96', cheer: 'A rock! Rock on!',
    talk: ['Is it smooth or rough?', 'Is it heavy?', 'Can you see sparkly bits in it?'],
    facts: ['Some rocks were made by volcanoes.', 'Rivers make rocks round and smooth.', 'Rocks can be millions of years old.'],
  },
  {
    id: 'water', one: 'some water', group: 'habitats', hint: 'Pond, stream or lake', emoji: '💧', label: 'Water', colour: '#1c7ed6', cheer: 'Water! Stay with a grown-up near water.',
    talk: ['Is the water moving or still?', 'Can you see anything living in it?', 'Where do you think it goes next?'],
    facts: ['Rain fills streams, and streams fill rivers.', 'Wetlands are like sponges for water.', 'Lots of tiny animals live in ponds.'],
  },
  {
    id: 'sky', one: 'the sky', group: 'habitats', hint: 'Clouds and weather', emoji: '☁️', label: 'Sky', colour: '#74c0fc', cheer: 'Look up! The sky!',
    talk: ['What shape is the cloud?', 'Is it windy?', 'What colour is the sky right now?'],
    facts: ['Clouds are made of tiny drops of water.', 'Rainbows need sun and rain at the same time.', 'The sky looks blue because of sunlight.'],
  },
  // ── Kinds added with the groups (2.5). Each says which older kind it is a kind of (`refines`). ──
  {
    id: 'shrub', group: 'plants', refines: 'plant', emoji: '🫐', label: 'Shrub', hint: 'A bush with woody stems', colour: '#5c940d',
    cheer: 'A shrub! Look at berries, but never eat them without a grown-up.',
    talk: ['Is it taller than you?', 'Does it have berries or flowers?', 'Could a bird hide in it?'],
    facts: ['A shrub has lots of woody stems. A tree usually has one trunk.', 'Blueberries grow on shrubs.', 'Shrubs give birds safe places to hide and nest.'],
  },
  {
    id: 'fern', group: 'plants', refines: 'plant', emoji: '🌿', label: 'Fern', hint: 'Feathery leaves', colour: '#37b24d',
    cheer: 'A fern! So feathery!',
    talk: ['Can you see little brown dots under the leaves?', 'Are any leaves curled up like a fiddle?', 'Is it in the sun or the shade?'],
    facts: ['Ferns have no flowers and no seeds. They grow from tiny spores.', 'A young fern leaf is curled up tight. It is called a fiddlehead.', 'Ferns were growing on Earth before the dinosaurs.'],
  },
  {
    id: 'moss', one: 'some moss', group: 'plants', refines: 'plant', emoji: '🌱', art: 'moss', label: 'Moss', hint: 'Soft and low', colour: '#74b816',
    cheer: 'Moss! Soft and green.',
    talk: ['Is it soft or prickly?', 'Is it growing on a rock, a log or the ground?', 'Is it wet or dry?'],
    facts: ['Moss has no roots. It holds on with tiny hairs.', 'Moss soaks up water like a sponge.', 'Peat moss can hold many times its own weight in water.'],
  },
  {
    id: 'grass', one: 'some grass', group: 'plants', refines: 'plant', emoji: '🌾', label: 'Grass', hint: 'Reeds and cattails too', colour: '#94a83a',
    cheer: 'Grass! Swish, swish!',
    talk: ['Is it taller than you?', 'Can you see seeds at the top?', 'Is it growing in a wet place?'],
    facts: ['Grass grows from the bottom, so it keeps growing after it is cut.', 'Cattails grow in wet places and give birds a place to nest.', 'Some grasses have sharp edges. Look with your eyes.'],
  },
  {
    id: 'mammal', group: 'animals', refines: 'animal', emoji: '🦌', label: 'Mammal', hint: 'Fur or hair', colour: '#d9480f',
    cheer: 'A mammal! Watch it from far away.',
    talk: ['Did it have fur?', 'Was it big or small?', 'Where do you think it sleeps?'],
    facts: ['Mammals have hair or fur.', 'Mammal babies drink milk from their mothers.', 'Watch wild animals from far away. Never touch or feed them.'],
  },
  {
    id: 'amphibian', group: 'animals', refines: 'animal', emoji: '🐸', label: 'Frog or salamander', short: 'Frog', colour: '#0ca678',
    cheer: 'A frog or salamander! Look, but do not touch.',
    talk: ['Was it on land or in water?', 'Was its skin wet or dry?', 'Did you hear it call?'],
    facts: ['Most frogs and salamanders start life as eggs in water.', 'Their skin is very thin. Lotion and sunscreen on our hands can hurt it, so look, do not touch.', 'Spring peepers are tiny frogs with a very loud call.'],
  },
  {
    id: 'reptile', group: 'animals', refines: 'animal', emoji: '🐢', label: 'Snake or turtle', short: 'Reptile', colour: '#5f8a1f',
    cheer: 'A snake or turtle! Watch it from far away.',
    talk: ['Did it have a shell or scales?', 'Was it lying in the sun?', 'Which way did it go?'],
    facts: ['Snakes and turtles lie in the sun to warm up.', "A turtle's shell is part of its skeleton.", 'Watch snakes and turtles from far away. Never pick one up.'],
  },
  {
    id: 'fish', group: 'animals', refines: 'animal', emoji: '🐟', label: 'Fish', colour: '#1098ad',
    cheer: 'A fish! Stay with a grown-up near water.',
    talk: ['Was it big or small?', 'Was the water fast or slow?', 'What colours did you see?'],
    facts: ['Fish breathe with gills.', 'Salmon swim from the sea up rivers to lay their eggs.', 'Stay with a grown-up near water.'],
  },
  {
    id: 'snail', group: 'animals', refines: 'animal', emoji: '🐌', label: 'Snail or slug', short: 'Snail', colour: '#ae3ec9',
    cheer: 'A snail or slug! Slowly, slowly.',
    talk: ['Did it have a shell?', 'Can you see its shiny trail?', 'Was it somewhere wet?'],
    facts: ['Snails and slugs slide on a trail of slime.', 'A slug is like a snail without a shell on its back.', 'Look, but do not touch. Wash your hands after exploring.'],
  },
  {
    id: 'capstem', full: 'Cap-and-stem mushroom', group: 'mushrooms', refines: 'mushroom', emoji: '🍄', label: 'Cap and stem', short: 'Cap', hint: 'Like an umbrella', colour: '#c92a2a',
    cheer: 'A cap-and-stem mushroom! Look, but never eat it!',
    talk: ['What colour is the cap?', 'Look under the cap: thin lines, or tiny holes?', 'Is it growing on the ground or on wood?'],
    facts: ['The thin lines under some caps are called gills.', 'Some mushrooms have tiny holes under the cap instead of gills.', 'Never eat a wild mushroom. Some look friendly and are poison.'],
  },
  {
    id: 'shelf', full: 'Shelf mushroom', group: 'mushrooms', refines: 'mushroom', emoji: '🍄', art: 'shelf', label: 'Shelf', hint: 'Sticks out of wood', colour: '#b5651d',
    cheer: 'A shelf mushroom! Look, but never eat it!',
    talk: ['Is it on a tree or a log?', 'Is it hard or soft?', 'Can you see stripes of colour on top?'],
    facts: ['Shelf mushrooms help rot old trees back into soil.', "Turkey Tail has stripes of colour like a turkey's tail.", 'Some shelf mushrooms keep growing for many years.'],
  },
  {
    id: 'puffball', group: 'mushrooms', refines: 'mushroom', emoji: '🍄', art: 'puffball', label: 'Puffball', hint: 'A round ball', colour: '#a68a64',
    cheer: 'A puffball! Look, but never eat it!',
    talk: ['Is it round like a ball?', 'Is it white, brown or grey?', 'Is there a hole on top?'],
    facts: ['When raindrops hit a ripe puffball, a cloud of spores puffs out.', 'Some poison mushrooms look like puffballs when they are young. Never eat one.', 'A giant puffball can grow as big as a soccer ball.'],
  },
  {
    id: 'lichen', group: 'lichens', emoji: '🍃', art: 'lichen', label: 'Lichen', pick: 'Just a lichen', colour: '#7c9a5a',
    cheer: 'A lichen! A fungus and tiny green partners, living together.',
    talk: ['Is it on a rock, a tree or the ground?', 'What colour is it?', 'Is it flat, leafy or bushy?'],
    facts: ['A lichen is a fungus and tiny green partners living together as a team.', 'Lichens grow very slowly. Some grow only a few millimetres a year.', 'Many lichens only grow where the air is clean.'],
  },
  {
    id: 'crusty', full: 'Crusty lichen', group: 'lichens', refines: 'lichen', emoji: '🍃', art: 'crusty', label: 'Crusty', hint: 'Flat like paint', colour: '#b8b13a',
    cheer: 'A crusty lichen! As flat as paint.',
    talk: ['Is it on a rock or on bark?', 'Can you see rings or spots?', 'What colour is it?'],
    facts: ['A crusty lichen sticks so tight it cannot be peeled off.', 'Map lichen grows in yellow-green patches with black lines, like a map.', 'Some crusty lichens on rocks are hundreds of years old.'],
  },
  {
    id: 'leafy', full: 'Leafy lichen', group: 'lichens', refines: 'lichen', emoji: '🍃', art: 'leafy', label: 'Leafy', hint: 'Flat little flaps', colour: '#7c9a5a',
    cheer: 'A leafy lichen! Flat little flaps.',
    talk: ['Do the edges curl up?', 'Is the top a different colour from the bottom?', 'Is it on a tree or a rock?'],
    facts: ['A leafy lichen has a top side and a bottom side, like a leaf.', 'Lungwort lichen grows on old trees and looks a bit like lungs.', 'Lichens are not plants, even the leafy ones.'],
  },
  {
    id: 'bushy', full: 'Bushy lichen', group: 'lichens', refines: 'lichen', emoji: '🍃', art: 'bushy', label: 'Bushy', hint: 'Tiny branches or hairs', colour: '#98ab8c',
    cheer: 'A bushy lichen! Like a tiny forest.',
    talk: ['Does it hang down like hair, or stand up?', 'Can you see red tips?', 'Is it on a tree or the ground?'],
    facts: ['Reindeer lichen is winter food for caribou.', 'British Soldiers lichen has bright red tops.', 'Beard lichens hang from branches like grey hair.'],
  },
  {
    id: 'forest', group: 'habitats', refines: 'habitat', emoji: '🌲', label: 'Forest', colour: '#2b6a3e',
    cheer: 'A forest! Listen to the trees.',
    talk: ['Is it dark or sunny under the trees?', 'What can you hear?', 'Are the trees tall or short?'],
    facts: ['Fallen logs become homes for bugs, moss and mushrooms.', 'Trees shade the forest floor and keep it cool.', 'Many birds and animals live in forests.'],
  },
  {
    id: 'meadow', group: 'habitats', refines: 'habitat', emoji: '🌼', label: 'Meadow', hint: 'Grass and flowers', colour: '#e8a317',
    cheer: 'A meadow! Lots of flowers and grass.',
    talk: ['What flowers can you see?', 'Can you hear buzzing?', 'Is it windy?'],
    facts: ['Meadow flowers feed bees and butterflies.', 'Some birds nest on the ground in meadows, so stay on the path.', 'A meadow needs lots of sun.'],
  },
  {
    id: 'wetland', group: 'habitats', refines: 'habitat', emoji: '💧', art: 'wetland', label: 'Wetland', hint: 'Marsh, bog or swamp', colour: '#0b7285',
    cheer: 'A wetland! Stay with a grown-up near water.',
    talk: ['Is the ground squishy?', 'Can you hear frogs or birds?', 'What plants grow in the water?'],
    facts: ['Wetlands soak up rain like a giant sponge.', 'Marshes, bogs and swamps are all wetlands.', 'Lots of frogs and birds raise their babies in wetlands.'],
  },
  {
    id: 'beach', group: 'habitats', refines: 'habitat', emoji: '🏖️', label: 'Beach', colour: '#d4a72c',
    cheer: 'A beach! Stay with a grown-up near water.',
    talk: ['Is it sand or rocks?', 'Can you find shells?', 'Is the tide coming in or going out?'],
    facts: ['Waves break rocks and shells into sand over a very long time.', 'The Bay of Fundy, beside Nova Scotia, has the highest tides in the world.', 'Stay with a grown-up near water.'],
  },
  {
    id: 'habitat', group: 'habitats', emoji: '🏞️', label: 'Habitat', pick: 'Another place', colour: '#228be6',
    cheer: 'A habitat! A home for living things.',
    talk: ['Who do you think lives here?', 'Is it wet or dry?', 'Is it sunny or shady?'],
    facts: ['A habitat is a place where plants and animals live.', 'Every habitat has its own living things.', 'Leave a habitat the way you found it.'],
  },
  {
    // Not in a group: something the explorer knows is not a plant, an animal, a mushroom, a lichen or a place.
    id: 'other', full: 'Something else', one: 'something else', emoji: '🧩', label: 'Other', colour: '#5c7cfa',
    cheer: 'Something else! Every find counts.',
    talk: ['What is it made of?', 'Where do you think it came from?', 'Was it made by nature or by people?'],
    facts: ['Shells, feathers and bones are clues about animals that were nearby.', 'Some things outside were made by people, like trash. Ask a grown-up before you pick anything up.', 'Explorers write down what they notice, even when it does not fit a group.'],
  },
  {
    // "Not sure" of everything. No longer offered (2.10: "Other" covers it); finds saved as one before stay one.
    id: 'mystery', emoji: '❓', label: 'Mystery', colour: '#9775fa', cheer: 'A mystery! Ooooh!',
    talk: ['What do you think it is?', 'Who could we ask?', 'What clues can you see?'],
    facts: ['Scientists find new living things every year.', 'Asking questions is what explorers do.', 'Every mystery is a chance to learn.'],
  },
];

export function categoryOf(id: CategoryId): Category {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

/**
 * The first screen of "What is it?": five groups, each opening its own kinds, plus "Other". A Sprout
 * picks a group and stops there (its `generic` kind); everyone else picks a kind within it, the generic one last, as
 * the "anything else" answer ("Just a plant", "Another shape").
 */
export interface Group {
  id: GroupId;
  emoji: string;
  /** A drawing (kindArt.ts) where no emoji says it. */
  art?: string;
  label: string;
  colour: string;
  /** Asked, and said, when the group is opened. */
  ask: string;
  /** The kind a group alone stands for: a Sprout's pick, and the "Just a plant" button. */
  generic: CategoryId;
  /** Its kinds, in the order they are offered: the generic one last. */
  kinds: CategoryId[];
}

export const GROUPS: Group[] = [
  { id: 'plants', emoji: '🌿', label: 'Plant', colour: '#40c057', ask: 'What kind of plant?', generic: 'plant',
    kinds: ['tree', 'shrub', 'flower', 'fern', 'moss', 'grass', 'plant'] },
  { id: 'animals', emoji: '🐾', label: 'Animal', colour: '#e8590c', ask: 'What kind of animal?', generic: 'animal',
    kinds: ['bird', 'mammal', 'bug', 'amphibian', 'reptile', 'fish', 'snail', 'sign', 'animal'] },
  { id: 'mushrooms', emoji: '🍄', label: 'Mushroom', colour: '#c92a2a', ask: 'What shape is the mushroom?', generic: 'mushroom',
    kinds: ['capstem', 'shelf', 'puffball', 'mushroom'] },
  { id: 'lichens', emoji: '🍃', art: 'lichen', label: 'Lichen', colour: '#7c9a5a', ask: 'What does the lichen look like?', generic: 'lichen',
    kinds: ['crusty', 'leafy', 'bushy', 'lichen'] },
  { id: 'habitats', emoji: '🏞️', label: 'Habitat', colour: '#228be6', ask: 'What kind of place?', generic: 'habitat',
    kinds: ['forest', 'meadow', 'wetland', 'water', 'beach', 'rock', 'sky', 'habitat'] },
];

export function groupOf(id: CategoryId): Group | undefined {
  const g = categoryOf(id).group;
  return g ? GROUPS.find(x => x.id === g) : undefined;
}

/** A group's kinds, as offered. */
export function kindsOf(group: Group): Category[] {
  return group.kinds.map(categoryOf);
}

/** A find of this kind after "You found": "a fern", "an animal", "some moss", "a shelf mushroom". */
export function oneOf(c: Category): string {
  const name = fullName(c);
  return c.one ?? `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name.toLowerCase()}`;
}

/** A kind's whole name, for a title or a sticker: "Shelf mushroom", "Fern". */
export function fullName(c: Category): string {
  return c.full ?? c.label;
}

/**
 * What a find is called on its sticker, its page and its pin: the explorer's name for it, else its species (from the
 * list, or their own words), else the kind of place a habitat is ("Softwood forest"), else its kind. The kind's
 * picture sits beside the name everywhere, so the kind is the last resort rather than the label.
 */
export function findName(f: { category: CategoryId; nickname?: string; species?: { name: string }; habitat?: { name: string } }): string {
  return f.nickname?.trim() || f.species?.name.trim() || f.habitat?.name.trim() || fullName(categoryOf(f.category));
}

/** A kind in words with its group when that adds something: "Shelf · Mushroom", "Plant" (not "Plant · Plant"). */
export function kindWords(c: Category): string {
  const g = groupOf(c.id);
  return g && g.generic !== c.id ? `${c.label} · ${g.label}` : c.label;
}

/**
 * Does a find of kind `k` count as `wanted`? It is that kind, or a kind of it (`refines`): a fern counts as a plant,
 * a shelf as a mushroom, a mammal as an animal. What counted before still counts; nothing that did stops counting.
 */
export function isKind(k: CategoryId, wanted: CategoryId): boolean {
  return k === wanted || categoryOf(k).refines === wanted;
}

export const COLOURS: { id: ColourId; label: string; hex: string }[] = [
  { id: 'red', label: 'Red', hex: '#fa5252' },
  { id: 'orange', label: 'Orange', hex: '#fd7e14' },
  { id: 'yellow', label: 'Yellow', hex: '#fcc419' },
  { id: 'green', label: 'Green', hex: '#40c057' },
  { id: 'blue', label: 'Blue', hex: '#339af0' },
  { id: 'purple', label: 'Purple', hex: '#845ef7' },
  { id: 'pink', label: 'Pink', hex: '#f783ac' },
  { id: 'brown', label: 'Brown', hex: '#8d5524' },
  { id: 'black', label: 'Black', hex: '#212529' },
  { id: 'white', label: 'White', hex: '#ffffff' },
  { id: 'grey', label: 'Grey', hex: '#adb5bd' },
];

/** Sizes are compared with things a child knows. */
export const SIZES: { id: SizeId; emoji: string; label: string }[] = [
  { id: 'tiny', emoji: '🐜', label: 'Tiny as an ant' },
  { id: 'small', emoji: '👍', label: 'Small as my thumb' },
  { id: 'medium', emoji: '✋', label: 'Big as my hand' },
  { id: 'big', emoji: '🧒', label: 'Big as me' },
  { id: 'huge', emoji: '🏠', label: 'Huge as a house' },
];

export const COUNTS: { id: CountId; emoji: string; label: string }[] = [
  { id: 'one', emoji: '1️⃣', label: 'Just one' },
  { id: 'few', emoji: '🖐️', label: 'A few' },
  { id: 'lots', emoji: '💯', label: 'Lots and lots' },
];

export const AVATARS = ['🦊', '🐻', '🐸', '🦉', '🐢', '🐰', '🦋', '🐞', '🦔', '🐝', '🦝', '🐙'];

/** The clues an animal leaves, for a 'sign' find. */
export const SIGNS: { id: SignId; emoji: string; label: string }[] = [
  { id: 'track', emoji: '🐾', label: 'Tracks' },
  { id: 'scat', emoji: '💩', label: 'Scat (poop)' },
  { id: 'chewed', emoji: '🌰', label: 'Chewed food' },
  { id: 'nest', emoji: '🪺', label: 'A nest' },
  { id: 'feather', emoji: '🪶', label: 'Feathers or fur' },
  { id: 'burrow', emoji: '🕳️', label: 'A hole or burrow' },
  { id: 'other', emoji: '🔎', label: 'Another clue' },
];

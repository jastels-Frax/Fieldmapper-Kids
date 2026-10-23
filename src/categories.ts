import type { CategoryId, ColourId, CountId, SignId, SizeId } from './types.ts';

export interface Category {
  id: CategoryId;
  emoji: string;
  label: string;
  colour: string;
  /** Said when the category is picked. */
  cheer: string;
  /** Questions a grown-up and child can talk about (Together mode). */
  talk: string[];
  /** Short true facts to wonder at. */
  facts: string[];
}

export const CATEGORIES: Category[] = [
  {
    id: 'bird', emoji: '🐦', label: 'Bird', colour: '#4dabf7', cheer: 'A bird! Tweet tweet!',
    talk: ['What sound did it make?', 'Was it flying, walking or sitting?', 'What do you think it eats?'],
    facts: ['Birds are the only animals with feathers.', 'Some birds fly thousands of kilometres every year.', 'A bird\'s bones are hollow, which makes them light.'],
  },
  {
    id: 'bug', emoji: '🐛', label: 'Bug', colour: '#82c91e', cheer: 'A bug! Wiggle wiggle!',
    talk: ['How many legs could you count?', 'Did it have wings?', 'Where do you think it lives?'],
    facts: ['Insects have six legs.', 'Spiders have eight legs, so they are not insects.', 'Caterpillars turn into butterflies or moths.'],
  },
  {
    id: 'plant', emoji: '🌿', label: 'Plant', colour: '#40c057', cheer: 'A plant! So green!',
    talk: ['How does the leaf feel?', 'Is it in the sun or the shade?', 'Do you think it needs a lot of water?'],
    facts: ['Plants make their own food from sunlight.', 'Moss has no flowers or seeds.', 'Some plants can grow back from a tiny piece.'],
  },
  {
    id: 'tree', emoji: '🌳', label: 'Tree', colour: '#2b8a3e', cheer: 'A tree! So tall!',
    talk: ['Can you hug all the way around it?', 'What does the bark feel like?', 'Does it have leaves or needles?'],
    facts: ['You can tell a tree\'s age by counting its rings.', 'Trees give us the air we breathe.', 'Some trees live for hundreds of years.'],
  },
  {
    id: 'flower', emoji: '🌸', label: 'Flower', colour: '#f783ac', cheer: 'A flower! How pretty!',
    talk: ['How many petals does it have?', 'Does it smell?', 'Did you see any bees nearby?'],
    facts: ['Bees carry pollen from flower to flower.', 'Some flowers close up at night.', 'Dandelion seeds fly on tiny parachutes.'],
  },
  {
    id: 'animal', emoji: '🐿️', label: 'Animal', colour: '#e8590c', cheer: 'An animal! Wow!',
    talk: ['Was it fast or slow?', 'Did it have fur, scales or skin?', 'Did it see you?'],
    facts: ['Squirrels bury nuts and forget some, which grow into trees.', 'Frogs can breathe through their skin.', 'Many animals come out at dusk.'],
  },
  {
    id: 'sign', emoji: '🐾', label: 'Tracks & scat', colour: '#a0522d', cheer: 'Animal clues! You are a detective!',
    talk: ['How many toes can you see in the track?', 'Which way was the animal going?', 'What animal do you think left it?'],
    facts: ['Scat is what scientists call animal poop. Look, but never touch it!', 'Deer and moose tracks show two toes; foxes and coyotes show four.', 'A chewed pine cone with the scales pulled off is often a red squirrel\'s lunch.'],
  },
  {
    id: 'rock', emoji: '🪨', label: 'Rock', colour: '#868e96', cheer: 'A rock! Rock on!',
    talk: ['Is it smooth or rough?', 'Is it heavy?', 'Can you see sparkly bits in it?'],
    facts: ['Some rocks were made by volcanoes.', 'Rivers make rocks round and smooth.', 'Rocks can be millions of years old.'],
  },
  {
    id: 'water', emoji: '💧', label: 'Water', colour: '#1c7ed6', cheer: 'Water! Splash!',
    talk: ['Is the water moving or still?', 'Can you see anything living in it?', 'Where do you think it goes next?'],
    facts: ['Rain fills streams, and streams fill rivers.', 'Wetlands are like sponges for water.', 'Lots of tiny animals live in ponds.'],
  },
  {
    id: 'sky', emoji: '☁️', label: 'Sky', colour: '#74c0fc', cheer: 'Look up! The sky!',
    talk: ['What shape is the cloud?', 'Is it windy?', 'What colour is the sky right now?'],
    facts: ['Clouds are made of tiny drops of water.', 'Rainbows need sun and rain at the same time.', 'The sky looks blue because of sunlight.'],
  },
  {
    id: 'mystery', emoji: '❓', label: 'Mystery', colour: '#9775fa', cheer: 'A mystery! Ooooh!',
    talk: ['What do you think it is?', 'Who could we ask?', 'What clues can you see?'],
    facts: ['Scientists find new living things every year.', 'Asking questions is what explorers do.', 'Every mystery is a chance to learn.'],
  },
];

export function categoryOf(id: CategoryId): Category {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
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

import type { GuideId } from './types.ts';
import type { Expression } from './buddies.ts';
import { GUIDE_INFO, activeGuide } from './guides.ts';

/** What the explorer's guide says. Lines are written once, in each guide's own sound. */
export interface Line {
  text: string;
  pose: Expression;
}

const sound = (g: GuideId) => GUIDE_INFO[activeGuide(g)].sound;
const isScout = (g: GuideId) => activeGuide(g) === 'scout';

/** Scout's own words, from the storybook. */
const SCOUT_GREET = [
  'Field notebook ready! What lives here? What grows here? Let\'s find out!',
  'Look first, listen close, and then we explore!',
  'Every good survey starts with paying attention. Ready?',
];
const SCOUT_TIPS = [
  'Stop, take a breath, and look around before you move.',
  'Write down what is here now. Scientists call that baseline data.',
  'Look for clues: tracks, scat, chewed cones. Animals leave notes too!',
  'Old trees have stories. Every ring is one year!',
  'The forest is all connected. Everything has an effect.',
  'Observe without disturbing. Look, but leave things be.',
];

const GREET: ((g: GuideId) => string)[] = [
  g => `${sound(g)}! Ready to explore?`,
  () => "Let's go and find something amazing!",
];

const TIPS: string[] = [
  'Look under leaves. Tiny bugs love to hide there!',
  'Stand very still and listen. Can you hear a bird?',
  'Look at the ground. Can you find any animal tracks?',
  'Look up! What shape are the clouds?',
  'Count the petals on a flower!',
  "Tap the star at the top for today's challenges!",
  'Puddles and ponds are full of life. Have a look!',
  'Be gentle with living things. Look, but leave them be.',
  'Stay where your grown-up can see you!',
  'Found poop? Scientists call it scat. Look, but never touch!',
];

const STEP: Record<string, string> = {
  picture: 'How do you want to remember it? Add as many photos and drawings as you like!',
  category: 'Ooh! What did you find?',
  sign: 'What clue did the animal leave?',
  species: 'What is it called? Type it your way, or pick one below.',
  place: 'What kind of place is it? Type it your way, or pick one below.',
  colours: 'What colours is it? Tap all the colours you see.',
  size: 'How big is it?',
  count: 'How many did you see?',
  describe: 'What does it look like? Tap what fits, or skip ahead.',
  where: 'Where did you find it?',
  tell: 'Tell me about it if you like, then save it!',
};

const STEP_POSES: Record<string, Expression> = {
  picture: 'hello', category: 'think', sign: 'think', species: 'think', place: 'think', describe: 'point', colours: 'point', size: 'excited', count: 'think', where: 'point', tell: 'listen',
};

export const STEP_LINES = STEP;

export function greet(g: GuideId, rand = Math.random): Line {
  if (isScout(g)) return { text: pick(SCOUT_GREET, rand), pose: 'hello' };
  return { text: pick(GREET, rand)(g), pose: 'hello' };
}

export function tip(g: GuideId, rand = Math.random): Line {
  const pool = isScout(g) && rand() < 0.5 ? SCOUT_TIPS : TIPS;
  return { text: pick(pool, rand), pose: rand() < 0.5 ? 'point' : 'wink' };
}

export function stepLine(_g: GuideId, step: string): Line {
  return { text: STEP[step] ?? STEP.picture, pose: STEP_POSES[step] ?? 'hello' };
}

export function cheer(g: GuideId, rand = Math.random): Line {
  const lines = isScout(g)
    ? ['Noted in my field journal! Great find!', 'That goes in the survey! Well spotted!', 'A real field scientist find!']
    : [`${sound(g)}! Great find!`, 'You are a super explorer!', 'Wow, what a find!'];
  return { text: pick(lines, rand), pose: 'success' };
}

function pick<T>(list: T[], rand: () => number): T {
  return list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
}

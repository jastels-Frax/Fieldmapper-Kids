import type { GuideId } from './types.ts';
import type { Expression } from './buddies.ts';
import { GUIDE_INFO } from './guides.ts';

/** What the explorer's guide says. Lines are written once, in each guide's own sound. */
export interface Line {
  text: string;
  pose: Expression;
}

const sound = (g: GuideId) => GUIDE_INFO[g].sound;

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
  species: 'Do you know what it is called?',
  colours: 'What colours is it? Tap all the colours you see.',
  size: 'How big is it?',
  count: 'How many did you see?',
  where: 'Where did you find it?',
  tell: 'Tell me all about it! What did you notice?',
};

const STEP_POSES: Record<string, Expression> = {
  picture: 'hello', category: 'think', sign: 'think', species: 'think', colours: 'point', size: 'excited', count: 'think', where: 'point', tell: 'listen',
};

export const STEP_LINES = STEP;

export function greet(g: GuideId, rand = Math.random): Line {
  return { text: pick(GREET, rand)(g), pose: 'hello' };
}

export function tip(_g: GuideId, rand = Math.random): Line {
  return { text: pick(TIPS, rand), pose: rand() < 0.5 ? 'point' : 'wink' };
}

export function stepLine(_g: GuideId, step: string): Line {
  return { text: STEP[step] ?? STEP.picture, pose: STEP_POSES[step] ?? 'hello' };
}

export function cheer(g: GuideId, rand = Math.random): Line {
  const lines = [`${sound(g)}! Great find!`, 'You are a super explorer!', 'Wow, what a find!'];
  return { text: pick(lines, rand), pose: 'success' };
}

function pick<T>(list: T[], rand: () => number): T {
  return list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
}

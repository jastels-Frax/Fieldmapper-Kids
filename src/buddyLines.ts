import type { Buddy, Expression } from './buddies.ts';

/** What Pip and Hop say. Each line is the same idea in the buddy's own voice. */
export interface Line {
  text: string;
  pose: Expression;
}

type Voiced = Record<Buddy, string>;
const both = (rat: string, frog: string): Voiced => ({ rat, frog });

const GREET: Voiced[] = [
  both('Squeak! Ready to explore?', 'Ribbit! Ready to explore?'),
  both("Let's sniff out something amazing!", "Let's hop to it and find something amazing!"),
];

/** Tips Pip and Hop give when tapped on the map. */
const TIPS: Voiced[] = [
  both('Look under leaves. Tiny bugs love to hide there!', 'Peek under leaves. Tiny bugs hide there, yum!'),
  both('Stand very still and listen. Can you hear a bird?', 'Sit still like me and listen. Can you hear a bird?'),
  both('Rocks come in so many colours. Find a sparkly one!', 'Find a smooth rock. Rivers make them round!'),
  both('Look up! What shape are the clouds?', 'Look up! Is that cloud shaped like a frog?'),
  both('Count the petals on a flower!', 'Can you find a flower with five petals?'),
  both('Tap the star at the top for today\'s challenges!', 'Tap the star at the top for today\'s challenges!'),
  both('Puddles and ponds are full of life. Have a look!', 'Water is my favourite! Find a pond or a puddle!'),
  both('Be gentle with living things. Look, but leave them be.', 'Be gentle with animals. We look, we do not touch.'),
  both('Do not wander off. Stay where your grown-up can see you!', 'Stay close to your grown-up, okay?'),
];

export const STEP_LINES: Record<string, Voiced> = {
  picture: both('How do you want to remember it?', 'How do you want to remember it?'),
  category: both('Ooh! What did you find?', 'Ooh! What did you find?'),
  colours: both('What colours is it? Tap all the colours you see.', 'What colours is it? Tap all the colours you see.'),
  size: both('How big is it? Bigger than me?', 'How big is it? Bigger than me?'),
  count: both('How many did you see?', 'How many did you see?'),
  tell: both('Tell me all about it! What did you notice?', 'Tell me about it! I am all ears. Well, I have no ears.'),
};

const STEP_POSES: Record<string, Expression> = {
  picture: 'hello', category: 'think', colours: 'point', size: 'excited', count: 'think', tell: 'listen',
};

const CHEER: Voiced[] = [
  both('Squeak squeak! Great find!', 'Ribbit ribbit! Great find!'),
  both('Whisker-licious!', 'Toad-ally awesome!'),
  both('You are a super explorer!', 'You are a hop-tastic explorer!'),
];

export function greet(b: Buddy, rand = Math.random): Line {
  return { text: pick(GREET, rand)[b], pose: 'hello' };
}

export function tip(b: Buddy, rand = Math.random): Line {
  return { text: pick(TIPS, rand)[b], pose: rand() < 0.5 ? 'point' : 'wink' };
}

export function stepLine(b: Buddy, step: string): Line {
  return { text: (STEP_LINES[step] ?? STEP_LINES.picture)[b], pose: STEP_POSES[step] ?? 'hello' };
}

export function cheer(b: Buddy, rand = Math.random): Line {
  return { text: pick(CHEER, rand)[b], pose: 'success' };
}

export function emptyBook(b: Buddy): Line {
  return { text: b === 'rat' ? 'No stickers yet! Let\'s go find something.' : 'No stickers yet! Let\'s hop out and find something.', pose: 'confused' };
}

function pick<T>(list: T[], rand: () => number): T {
  return list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
}

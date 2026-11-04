import type { Critter } from './critters.ts';

/**
 * The guided tour, as DATA — Field Mapper's `src/tour/tourCatalog.ts` model, ported: the steps are data, the rules
 * are pure and tested (`test/tourSteps.test.ts`), and `tour.ts` only draws, measures and remembers.
 *
 * Scout's departure: a step has a SPEAKER. The explorer's own guide shows the map, and each of the crew explains
 * their own part of the app (cast.ts): Acorn the sticker book, Hoot the facts, Maple the badges, Bandit the
 * challenges, Fern the hunts, Bramble staying safe and the grown-up lock.
 *
 * A step carries a `rev`. **A release that moves or changes a toured part bumps that step's rev**, so an explorer
 * who has had the tour sees only what changed (under "Some things are new"), never the whole tour again. A new step
 * is new to everyone.
 */
export type Speaker = 'guide' | Critter;

export interface TourStep {
  id: string;
  rev: number;
  speaker: Speaker;
  /**
   * What to light up, a CSS selector; null = a card in the middle. Map buttons are chosen per explorer (railTools.ts),
   * so a button's selector is its class (`.finds-btn`), found wherever it sits, in the bar or on the side.
   */
  target: string | null;
  /**
   * When the target is not on screen (a button this explorer took off the map): `skip` the step, or `centre` the card
   * and say it anyway — a crew member still explains their part, and says where it lives. Default `skip`.
   */
  ifMissing?: 'skip' | 'centre';
  title: string;
  /** `{name}` is the explorer's name, `{guide}` the guide's. Short: read aloud, and read by children. */
  body: string;
}

export const TOUR: TourStep[] = [
  { id: 'found', rev: 1, speaker: 'guide', target: '.found-btn',
    title: 'I found something!', body: 'Found something cool? Tap here. Take a picture, say what it is, and save it on your map.' },
  { id: 'hold', rev: 1, speaker: 'guide', target: null,
    title: 'Hold the map', body: 'You can also hold your finger on the map to save a find right at that spot.' },
  { id: 'me', rev: 1, speaker: 'guide', target: '.me-btn',
    title: 'Where am I?', body: 'Tap Me to see where you are. The map follows you as you walk. Tap it again to stop.' },
  { id: 'buttons', rev: 1, speaker: 'guide', target: '#side-body',
    title: 'Your map buttons', body: 'Each button has a picture and a word. Pick your own buttons in 🔧 My buttons.' },
  { id: 'photo', rev: 1, speaker: 'guide', target: '.photo-btn',
    title: 'Photo spots', body: 'Take a picture of a view. Come back another day and take it again, to see what changed!' },
  { id: 'path', rev: 1, speaker: 'guide', target: '.path-btn',
    title: 'Record my path', body: 'Tap Path and go for a walk. Scout draws where you went. Tap Stop when you are done.' },
  { id: 'finds', rev: 1, speaker: 'squirrel', target: '.finds-btn', ifMissing: 'centre',
    title: 'Your sticker book', body: 'I am Acorn! Every find you save goes in 📖 My Finds, your sticker book. Tap a find to see it again.' },
  { id: 'facts', rev: 1, speaker: 'owl', target: null,
    title: 'Fun facts', body: 'Hoo hoo, I am Hoot! When you save a find, I tell you a fun fact about it.' },
  { id: 'badges', rev: 1, speaker: 'moose', target: '.badges-btn', ifMissing: 'centre',
    title: 'Badges', body: 'I am Maple! I keep your 🏅 Badges. Find lots of different things to earn them all.' },
  { id: 'challenges', rev: 1, speaker: 'raccoon', target: '.pill.star', ifMissing: 'centre',
    title: "Today's challenges", body: 'Psst, I am Bandit! Every day I hide three challenges up here. They tick themselves when you save a find that fits.' },
  { id: 'hunts', rev: 1, speaker: 'fox', target: '.hunts-btn', ifMissing: 'centre',
    title: 'Scavenger hunts', body: 'I am Fern! In 🔎 Hunts, pick a hunt and find everything on the list to win a trophy.' },
  { id: 'safety', rev: 1, speaker: 'bear', target: '.done-btn', ifMissing: 'centre',
    title: 'Staying safe', body: 'I am Bramble, the safety ranger. Stay where your grown-up can see you. When you are done, tap 🏠 Done and we will check for ticks.' },
  { id: 'grownups', rev: 1, speaker: 'bear', target: '.lock',
    title: 'For grown-ups', body: 'The 🔒 is for your grown-up. Some things, like deleting, ask them first.' },
  { id: 'you', rev: 1, speaker: 'guide', target: '.hello',
    title: 'That is you, {name}!', body: 'Tap your name to change your card or who is exploring. Want this tour again? It is in ❓ How to use. Have fun exploring!' },
];

/** Which version of each step an explorer has seen. Absent = never. */
export type SeenMap = Record<string, number>;

/** The steps this explorer has not seen at their current rev. */
export function pendingSteps(steps: readonly TourStep[], seen: SeenMap): TourStep[] {
  return steps.filter(s => (seen[s.id] ?? 0) < s.rev);
}

/** Has this explorer seen any step, at any rev? */
export function tourStarted(steps: readonly TourStep[], seen: SeenMap): boolean {
  return steps.some(s => (seen[s.id] ?? 0) > 0);
}

/** The seen map after showing `shown` (only those: a step never shown stays pending). */
export function markSeen(seen: SeenMap, shown: readonly TourStep[]): SeenMap {
  const out = { ...seen };
  for (const s of shown) out[s.id] = Math.max(out[s.id] ?? 0, s.rev);
  return out;
}

/** The opening card: a welcome the first time, "some things are new" after an update. */
export function introFor(steps: readonly TourStep[], seen: SeenMap, guide: string, name: string): { title: string; body: string } {
  const who = name.trim() || 'explorer';
  if (!tourStarted(steps, seen)) {
    return { title: `Hi ${who}! I am ${guide}.`, body: 'Let me show you around Scout, with a little help from my friends. You can skip any time.' };
  }
  return { title: 'Some things are new!', body: `${guide} will show you what changed since last time.` };
}

/** `{name}` and `{guide}` filled in. */
export function fill(text: string, name: string, guide: string): string {
  return text.split('{name}').join(name.trim() || 'explorer').split('{guide}').join(guide);
}

/**
 * Whether a step's target counts as SHOWN when its element is drawn or not: a step whose target is missing is
 * skipped (and stays pending, so it shows the day the button is back), unless it centres instead.
 */
export function stepToShow(step: TourStep, drawn: boolean): 'target' | 'centre' | 'skip' {
  if (!step.target) return 'centre';
  if (drawn) return 'target';
  return step.ifMissing === 'centre' ? 'centre' : 'skip';
}

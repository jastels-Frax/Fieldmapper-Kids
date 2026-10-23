import type { GuideId } from './types.ts';
import { buddySvg, type Expression } from './buddies.ts';
import { critterSvg, type Critter } from './critters.ts';
import { CAST } from './cast.ts';

/** Every character an explorer can pick as their guide. */
export const GUIDES: GuideId[] = ['frog', 'rat', 'fox', 'moose', 'bear', 'owl', 'squirrel', 'raccoon'];

export interface GuideInfo {
  id: GuideId;
  /** The character's own name. */
  name: string;
  species: string;
  /** What they say instead of "hello". */
  sound: string;
}

export const GUIDE_INFO: Record<GuideId, GuideInfo> = {
  frog: { id: 'frog', name: 'Hop', species: 'frog', sound: 'Ribbit' },
  rat: { id: 'rat', name: 'Pip', species: 'rat', sound: 'Squeak' },
  fox: { id: 'fox', name: CAST.fox.name, species: 'fox', sound: 'Yip yip' },
  moose: { id: 'moose', name: CAST.moose.name, species: 'moose', sound: 'Hrrumph' },
  bear: { id: 'bear', name: CAST.bear.name, species: 'bear', sound: 'Grrr-eetings' },
  owl: { id: 'owl', name: CAST.owl.name, species: 'owl', sound: 'Hoo hoo' },
  squirrel: { id: 'squirrel', name: CAST.squirrel.name, species: 'squirrel', sound: 'Chitter chitter' },
  raccoon: { id: 'raccoon', name: CAST.raccoon.name, species: 'raccoon', sound: 'Psst' },
  scout: { id: 'scout', name: 'Scout the Survey Squirrel', species: 'survey squirrel', sound: 'Chitter chitter' },
};

/**
 * The Field Journal look is the storybook "Scout the Survey Squirrel", so while it is on, Scout
 * stands in for the explorer's own guide: their figure, their name and their lines. The choice
 * on the profile is untouched and comes back with any other look. The crew keep their jobs.
 * Set by lookApply; module state, so the pure line and name helpers can ask it.
 */
let journal = false;

export function setJournalGuide(on: boolean): void {
  journal = on;
}

export const journalGuideOn = (): boolean => journal;

/** Who actually speaks for an explorer whose chosen guide is `g`. */
export function activeGuide(g: GuideId): GuideId {
  return journal ? 'scout' : g;
}

export function isCrew(g: GuideId): g is Critter {
  return g !== 'rat' && g !== 'frog' && g !== 'scout';
}

export function guideSvg(g: GuideId, pose: Expression = 'hello'): string {
  // Scout is a painted portrait (scoutArt.ts), never an SVG; a pure caller gets the crew's squirrel.
  if (g === 'scout') return critterSvg('squirrel', pose);
  return isCrew(g) ? critterSvg(g, pose) : buddySvg(g, pose);
}

/** The name the explorer calls their guide: their own, trimmed and bounded, or the character's. */
export function guideName(g: GuideId, custom?: string): string {
  const c = (custom ?? '').trim().slice(0, 20);
  return c || GUIDE_INFO[g].name;
}

export function normalizeGuide(v: unknown): GuideId {
  return (GUIDES as string[]).includes(v as string) ? (v as GuideId) : 'frog';
}

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
};

export function isCrew(g: GuideId): g is Critter {
  return g !== 'rat' && g !== 'frog';
}

export function guideSvg(g: GuideId, pose: Expression = 'hello'): string {
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

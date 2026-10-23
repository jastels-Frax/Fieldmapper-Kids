import type { Mode } from './types.ts';
import type { Look } from './look.ts';

/**
 * Age tiers (docs/AGE_TIERS.md): what Scout asks, how it says it and which tools
 * it offers grow with the child — never what it stores. Phase 1 records the
 * tier on the explorer's card; the per-tier behaviour arrives in later phases,
 * read from this catalogue. Pure.
 */
export type TierId = 'sprout' | 'explorer' | 'naturalist';

export interface Tier {
  id: TierId;
  emoji: string;
  label: string;
  ages: string;
  /** One line for the grown-up choosing. */
  blurb: string;
  /** The mode a new explorer of this tier starts in (a grown-up can change it any time). */
  defaultMode: Mode;
  /** The look a new explorer of this tier starts with. */
  defaultLook: Partial<Look>;
}

export const TIERS: Tier[] = [
  { id: 'sprout', emoji: '🌱', label: 'Sprout', ages: 'about 4–6',
    blurb: 'Pictures first, everything read aloud, no typing.', defaultMode: 'together', defaultLook: { text: 'big' } },
  { id: 'explorer', emoji: '🧭', label: 'Explorer', ages: 'about 7–9',
    blurb: 'Short words read aloud, a little typing, all of the finding.', defaultMode: 'explorer', defaultLook: {} },
  { id: 'naturalist', emoji: '🔬', label: 'Naturalist', ages: 'about 10–12',
    blurb: 'Field notes, scientific names and the tools of a real naturalist.', defaultMode: 'explorer', defaultLook: { font: 'plain', buttons: 'flat' } },
];

/** Absence is the grandfather rule: everyone before tiers existed is an Explorer. */
export function tierOf(id: unknown): Tier {
  return TIERS.find(t => t.id === id) ?? TIERS[1];
}

/** What the two modes are called now that "Explorer" names a tier. The stored values stay 'explorer' | 'together'. */
export const MODE_WORDS: Record<Mode, { emoji: string; title: string; short: string }> = {
  explorer: { emoji: '🧒', title: 'On my own', short: 'on my own' },
  together: { emoji: '👨‍👧', title: 'Together', short: 'together with a grown-up' },
};

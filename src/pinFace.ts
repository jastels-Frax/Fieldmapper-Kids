/**
 * What a find's pin on the map shows (the Map card's "On each pin"): its picture (the first photo or drawing), its
 * kind, and who found it — each switched on or off by the family. Every part switched on appears ONCE: the pin
 * itself holds the first one it has, in that order, and the rest stand as small badges down its right side (two
 * badges in opposite corners read as a pair of ears, not as a pin). Pure.
 */
export interface PinParts {
  picture: boolean;
  kind: boolean;
  finder: boolean;
}

/** Absent (or not a boolean) = on: what pins showed before the choice existed. */
export function pinParts(stored: Partial<Record<keyof PinParts, unknown>> | undefined): PinParts {
  const on = (v: unknown) => v !== false;
  return { picture: on(stored?.picture), kind: on(stored?.kind), finder: on(stored?.finder) };
}

export type PinItem = 'picture' | 'kind' | 'finder';

/**
 * The pin's face and its badges, for what this find has: a picture only if it has one, a finder only when who found
 * it is being shown (Everyone's finds). Nothing switched on leaves a plain pin in the kind's colour.
 */
export function pinLayout(parts: PinParts, has: { picture: boolean; finder: boolean }): { face: PinItem | null; badges: PinItem[] } {
  const shown: PinItem[] = [];
  if (parts.picture && has.picture) shown.push('picture');
  if (parts.kind) shown.push('kind');
  if (parts.finder && has.finder) shown.push('finder');
  return { face: shown[0] ?? null, badges: shown.slice(1) };
}

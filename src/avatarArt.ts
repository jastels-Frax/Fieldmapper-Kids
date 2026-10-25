import type { MapAvatar, Profile } from './types.ts';

/**
 * Storybook portraits an explorer can choose as their card picture or their map marker, cropped from the
 * "Scout the Survey Squirrel" pages (src/assets/avatars/*.webp, round-cropped on screen). The pure half: ids,
 * names, and which picture stands for an explorer where; avatars.ts maps an id to its image. Pure.
 */
export const AVATAR_ART: { id: string; label: string }[] = [
  { id: 'scout', label: 'Scout' }, { id: 'scout-hat', label: 'Scout waving' }, { id: 'owl', label: 'Owl' },
  { id: 'robin', label: 'Robin' }, { id: 'bluejay', label: 'Blue Jay' }, { id: 'beaver', label: 'Beaver' },
  { id: 'moose', label: 'Moose' }, { id: 'bear', label: 'Bear' }, { id: 'frog', label: 'Frog' },
  { id: 'turtle', label: 'Turtle' }, { id: 'bat', label: 'Bat' },
];

export function isArt(id: unknown): id is string {
  return typeof id === 'string' && AVATAR_ART.some(a => a.id === id);
}

/** What the explorer's card shows: their photo, else their storybook portrait, else their emoji. */
export type Picture = { kind: 'photo' } | { kind: 'art'; art: string } | { kind: 'emoji'; emoji: string };

export function cardPicture(p: Pick<Profile, 'photo' | 'art' | 'avatar'>): Picture {
  if (p.photo) return { kind: 'photo' };
  if (isArt(p.art)) return { kind: 'art', art: p.art };
  return { kind: 'emoji', emoji: p.avatar };
}

/**
 * What stands for the explorer on the map: their own choice (an emoji or a portrait), or — absent, or a portrait
 * this build no longer has — the same picture as their card.
 */
export function mapPicture(p: Pick<Profile, 'photo' | 'art' | 'avatar' | 'mapAvatar'>): Picture {
  const m: MapAvatar | undefined = p.mapAvatar;
  if (m?.kind === 'emoji' && m.emoji) return { kind: 'emoji', emoji: m.emoji };
  if (m?.kind === 'art' && isArt(m.art)) return { kind: 'art', art: m.art };
  return cardPicture(p);
}

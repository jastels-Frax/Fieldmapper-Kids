/** How the app talks to whoever is holding it. */
export type Mode = 'explorer' | 'together';

export type CategoryId = 'bird' | 'bug' | 'plant' | 'tree' | 'flower' | 'animal' | 'rock' | 'water' | 'sky' | 'mystery';

export type SizeId = 'tiny' | 'small' | 'medium' | 'big' | 'huge';
export type CountId = 'one' | 'few' | 'lots';
export type ColourId = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'brown' | 'black' | 'white' | 'grey';

/** One thing a child found. Everything is optional except what makes it a find. */
export interface Find {
  id: string;
  /** ISO 8601, the moment it was saved. */
  createdAt: string;
  category: CategoryId;
  colours: ColourId[];
  size?: SizeId;
  count?: CountId;
  /** A name the child gave it ("Mr Snail"). Together mode only asks for one. */
  nickname?: string;
  /** Typed by a grown-up in Together mode. */
  note?: string;
  /** Where it was found. Absent when there was no location fix. */
  lat?: number;
  lon?: number;
  accuracy?: number;
  photo?: Blob;
  /** A small square copy of the photo or drawing, for the map and the sticker book. */
  thumb?: Blob;
  drawing?: Blob;
  voice?: Blob;
  favourite?: boolean;
}

export interface Settings {
  /** Absent until the welcome screen has been completed. */
  mode?: Mode;
  name: string;
  avatar: string;
  readAloud: boolean;
  sounds: boolean;
  /** Draw today's walking trail on the map. */
  trail: boolean;
  /** The explorer's buddy: Pip the rat or Hop the frog. */
  buddy: 'rat' | 'frog';
  /** Offer a tick check when a hunt ends. */
  tickReminder: boolean;
  /** When each tick check was finished (ISO), newest last; feeds the Tick Checker badge. */
  tickChecks?: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  avatar: '🦊',
  readAloud: true,
  sounds: true,
  trail: true,
  buddy: 'frog',
  tickReminder: true,
};

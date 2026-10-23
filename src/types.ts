/** How the app talks to whoever is holding it. */
export type Mode = 'explorer' | 'together';

export type CategoryId = 'bird' | 'bug' | 'plant' | 'tree' | 'flower' | 'animal' | 'sign' | 'rock' | 'water' | 'sky' | 'mystery';

export type SizeId = 'tiny' | 'small' | 'medium' | 'big' | 'huge';
export type CountId = 'one' | 'few' | 'lots';
export type ColourId = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'brown' | 'black' | 'white' | 'grey';
/** What an animal left behind, for a 'sign' find. */
export type SignId = 'track' | 'scat' | 'chewed' | 'nest' | 'feather' | 'burrow' | 'other';

/** The character who guides an explorer: Pip, Hop or any of the woodland crew. */
export type GuideId = 'rat' | 'frog' | 'fox' | 'moose' | 'bear' | 'owl' | 'squirrel' | 'raccoon';

/** One picture of a find. A find holds as many as the explorer likes. */
export interface Picture {
  id: string;
  kind: 'photo' | 'drawing';
  blob: Blob;
}

/** A species the explorer (or a grown-up) named for a find. */
export interface SpeciesPick {
  name: string;
  scientific?: string;
  taxon?: string;
  /** ACCDC element code, when the list carried one. */
  code?: string;
  /** Which species list it came from. */
  list?: string;
}

/** One thing a child found. Everything is optional except what makes it a find. */
export interface Find {
  id: string;
  /** Which explorer found it. Absent only on a record read before profiles existed. */
  profileId?: string;
  /** ISO 8601, the moment it was first saved. */
  createdAt: string;
  /** ISO 8601, the last time it was changed after saving. */
  editedAt?: string;
  category: CategoryId;
  /** For a 'sign' find: what the animal left. */
  sign?: SignId;
  species?: SpeciesPick;
  colours: ColourId[];
  size?: SizeId;
  count?: CountId;
  /** A name the child gave it ("Mr Snail"). */
  nickname?: string;
  /** Typed by a grown-up in Together mode. */
  note?: string;
  /** Where it was found. Absent when there was no location fix. */
  lat?: number;
  lon?: number;
  accuracy?: number;
  /** How the place was set: the device's location, or a spot tapped on the map. */
  placeBy?: 'gps' | 'map';
  /** Photos and drawings, in the order they were added. */
  pictures: Picture[];
  /** A small square copy of the first picture, for the map and the sticker book. */
  thumb?: Blob;
  voice?: Blob;
  favourite?: boolean;
  /** Read only from records saved before pictures were a list; normalizeFind moves them. */
  photo?: Blob;
  drawing?: Blob;
}

/** One explorer on this device. */
export interface Profile {
  id: string;
  name: string;
  /** An emoji for the map and the top bar, used when there is no photo. */
  avatar: string;
  /** A picture of the explorer (or anything they like), shown instead of the avatar. */
  photo?: Blob;
  /** "Loves frogs and puddles": a line about them, optional. */
  about?: string;
  mode: Mode;
  guide: GuideId;
  /** The explorer's own name for their guide; absent = the guide's real name. */
  guideName?: string;
  /** When each tick check was finished (ISO), newest last; feeds the Tick Checker badge. */
  tickChecks?: string[];
  /** How Scout looks for this explorer (look.ts); absent = the default look. */
  look?: Partial<import('./look.ts').Look>;
  createdAt: string;
}

export type Basemap = 'streets' | 'satellite' | 'hybrid';

/** Device settings, shared by every explorer on it. */
export interface Settings {
  activeProfileId?: string;
  readAloud: boolean;
  sounds: boolean;
  /** Draw today's walking trail on the map. */
  trail: boolean;
  /** Offer a tick check when a hunt ends. */
  tickReminder: boolean;
  basemap: Basemap;
  /** Show the "Record my path" button on the map. */
  pathRecording: boolean;
  /** Draw saved paths on the map. */
  walksOnMap: boolean;
  /** Keep the screen on while a path records (a phone stops GPS when it sleeps). */
  keepAwake: boolean;
  /** The speech voice a grown-up chose; absent = the best one installed. */
  voiceURI?: string;
}

export const DEFAULT_SETTINGS: Settings = {
  pathRecording: true,
  walksOnMap: true,
  keepAwake: true,
  readAloud: true,
  sounds: true,
  trail: true,
  tickReminder: true,
  basemap: 'streets',
};

/** Pre-profile settings, as version 1 stored them: read once, by the migration. */
export interface LegacySettings {
  mode?: Mode;
  name?: string;
  avatar?: string;
  buddy?: 'rat' | 'frog';
  tickChecks?: string[];
}

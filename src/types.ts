/** How the app talks to whoever is holding it. */
export type Mode = 'explorer' | 'together';

export type CategoryId = 'bird' | 'bug' | 'plant' | 'tree' | 'flower' | 'animal' | 'mushroom' | 'sign' | 'rock' | 'water' | 'sky' | 'mystery';

export type SizeId = 'tiny' | 'small' | 'medium' | 'big' | 'huge';
export type CountId = 'one' | 'few' | 'lots';
export type ColourId = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'brown' | 'black' | 'white' | 'grey';
/** What an animal left behind, for a 'sign' find. */
export type SignId = 'track' | 'scat' | 'chewed' | 'nest' | 'feather' | 'burrow' | 'other';

/** The character who guides an explorer: Pip, Hop or any of the woodland crew. */
/** `scout` is never chosen or stored: he is the guide of the Field Journal look (guides.activeGuide). */
export type GuideId = 'rat' | 'frog' | 'fox' | 'moose' | 'bear' | 'owl' | 'squirrel' | 'raccoon' | 'scout';

/** One picture of a find. A find holds as many as the explorer likes. */
export interface Picture {
  id: string;
  kind: 'photo' | 'drawing';
  blob: Blob;
}

/** Which pictures a find has, without their bytes: what the app holds for every find (findSplit.ts). */
export type PictureInfo = Pick<Picture, 'id' | 'kind'>;

/** A find's pictures and voice notes, read only when the find is opened, changed or exported. */
export interface FindMedia {
  pictures: Picture[];
  /** Voice notes, oldest first. A find stored before there could be several holds one (read from `voice`). */
  voices: Blob[];
}

/** A find with its media: what the capture flow edits and what saveFind stores. */
export type FullFind = Omit<Find, 'pictures' | 'hasVoice' | 'voiceCount'> & FindMedia;

/** A species the explorer (or a grown-up) named for a find. */
/** A line or a shape an explorer drew on the map (the ✏️ Draw tool). Belongs to a profile. */
export interface Sketch {
  id: string;
  profileId?: string;
  createdAt: string;
  kind: 'line' | 'area';
  /** [lon, lat], in the order tapped; an area is closed back to its first point when drawn. */
  points: [number, number][];
  colour: string;
  name?: string;
}

export interface SpeciesPick {
  name: string;
  scientific?: string;
  taxon?: string;
  /** ACCDC element code, when the list carried one. */
  code?: string;
  /** Which species list it came from. */
  list?: string;
  /** The explorer's own words ("little plant"), typed rather than picked from a list: never counted as a species. */
  own?: boolean;
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
  /** Photos and drawings, in the order they were added: which ones, not their bytes (`FindMedia`). */
  pictures: PictureInfo[];
  /** A small square copy of the first picture, for the map and the sticker book. */
  thumb?: Blob;
  /** There is a voice note in the find's media. */
  hasVoice?: boolean;
  /** How many voice notes; absent on a find from before there could be several, which has one if `hasVoice`. */
  voiceCount?: number;
  favourite?: boolean;
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
  /** Age tier (tiers.ts); absent = Explorer, which is what every explorer before tiers was. */
  tier?: import('./tiers.ts').TierId;
  guide: GuideId;
  /** The explorer's own name for their guide; absent = the guide's real name. */
  guideName?: string;
  /** When each tick check was finished (ISO), newest last; feeds the Tick Checker badge. */
  tickChecks?: string[];
  /** How Scout looks for this explorer (look.ts); absent = the default look. */
  look?: Partial<import('./look.ts').Look>;
  /** Their map buttons, in order ("My buttons", railTools.ts); absent = their age tier's default. */
  tools?: string[];
  /** A storybook portrait (avatars.ts) for their card, used when there is no photo. */
  art?: string;
  /** Their marker on the map; absent = the same picture as their card. */
  mapAvatar?: MapAvatar;
  /** Their 📸 quick-find buttons (quickFinds.ts); absent = off. */
  quick?: QuickPref;
  createdAt: string;
}

/** An explorer's quick finds: on or off, and the kinds they picked (none = the kinds they find most). */
export interface QuickPref {
  on: boolean;
  kinds?: CategoryId[];
}

/** What stands for the explorer on the map, when it is not their card picture. */
export type MapAvatar = { kind: 'emoji'; emoji: string } | { kind: 'art'; art: string };

export type Basemap = 'streets' | 'satellite' | 'hybrid';

/** Device settings, shared by every explorer on it. */
export interface Settings {
  activeProfileId?: string;
  /** Read the words aloud as they appear. Off unless a grown-up turns it on (grown-up corner); a tapped bubble is always read. */
  readAloud: boolean;
  /** A grown-up has set `readAloud` on purpose; until then it reads as off (see loadSettings). */
  readAloudChosen?: boolean;
  sounds: boolean;
  /**
   * Record today's walk automatically, whether or not 👣 Path is on, and draw it. Off unless a grown-up turns it on:
   * tracking happens only when the explorer asks for it (Path).
   */
  trail: boolean;
  /** A grown-up has set `trail` on purpose. Every device that never did reads `trail` as off (see loadSettings). */
  trailChosen?: boolean;
  /** Offer a tick check when a hunt ends. */
  tickReminder: boolean;
  basemap: Basemap;
  /** Show the "Record my path" button on the map. */
  pathRecording: boolean;
  /** Draw saved paths on the map. */
  walksOnMap: boolean;
  /** Keep the screen on while a path records (a phone stops GPS when it sleeps). */
  keepAwake: boolean;
  /** Keep the screen on whenever Scout is open (the Map card's switch): Field Mapper's `wakelock_enabled`. */
  wakeLock: boolean;
  /**
   * RETIRED: quick finds are per explorer now (`Profile.quick`, off unless turned on). Still read so a stored
   * value stays typed; nothing acts on it, because every device stored `true` from the old default.
   */
  quickFinds?: boolean;
  /** Show an arrow on the map pointing the way the explorer is facing (the device compass). */
  compass: boolean;
  /** Keep the map centred on the explorer as they move: Field Mapper's Follow (`follow_user`). */
  follow: boolean;
  /**
   * 'characters': every guide and crew member speaks in a voice of their own (the default).
   * 'one': everyone speaks in one voice, `voiceURI` or the best installed.
   */
  voiceMode: 'characters' | 'one';
  /** The speech voice a grown-up chose; absent = the best one installed. */
  voiceURI?: string;
  /**
   * The grown-up confirmed `voiceURI` though it reads over the internet (voiceRank.isCloudVoice). Without it a
   * cloud voice chosen before that warning existed is not used: the best device voice speaks instead.
   */
  voiceCloudOk?: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  pathRecording: true,
  walksOnMap: true,
  keepAwake: true,
  wakeLock: false,
  readAloud: false,
  sounds: true,
  trail: false,
  tickReminder: true,
  basemap: 'streets',
  compass: false,
  follow: false,
  voiceMode: 'characters',
};

/** Pre-profile settings, as version 1 stored them: read once, by the migration. */
export interface LegacySettings {
  mode?: Mode;
  name?: string;
  avatar?: string;
  buddy?: 'rat' | 'frog';
  tickChecks?: string[];
}

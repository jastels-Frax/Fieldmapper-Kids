import type { CategoryId, Find } from './types.ts';
import { distanceM, localDay, localHour } from './geo.ts';

/** What a badge needs to know about a find: no pixels, no sound. */
export type BadgeFind = Pick<Find, 'createdAt' | 'category' | 'colours' | 'size' | 'count' | 'lat' | 'lon'> & {
  hasPhoto?: boolean;
  hasDrawing?: boolean;
  hasVoice?: boolean;
};

export interface Badge {
  id: string;
  emoji: string;
  title: string;
  /** What to do to earn it, said to a child. */
  how: string;
  target: number;
}

export interface BadgeProgress extends Badge {
  value: number;
  earned: boolean;
}

export interface BadgeClock {
  dayOf: (iso: string) => string;
  hourOf: (iso: string) => number;
}

const LOCAL_CLOCK: BadgeClock = { dayOf: localDay, hourOf: localHour };

const count = (finds: BadgeFind[], cat: CategoryId) => finds.filter(f => f.category === cat).length;

/** What a badge may know beyond the finds themselves. */
export interface BadgeExtras {
  huntsCompleted?: number;
}

interface BadgeRule extends Badge {
  measure: (finds: BadgeFind[], clock: BadgeClock, extra: BadgeExtras) => number;
}

/** Categories that count towards "one of everything" (a mystery is not a kind of thing). */
export const COLLECTABLE: CategoryId[] = ['bird', 'bug', 'plant', 'tree', 'flower', 'animal', 'rock', 'water', 'sky'];

const RULES: BadgeRule[] = [
  { id: 'first', emoji: '⭐', title: 'First Find', how: 'Save your very first find.', target: 1, measure: f => f.length },
  { id: 'ten', emoji: '🎒', title: 'Explorer', how: 'Save 10 finds.', target: 10, measure: f => f.length },
  { id: 'fifty', emoji: '🏆', title: 'Super Explorer', how: 'Save 50 finds.', target: 50, measure: f => f.length },
  { id: 'birds', emoji: '🐦', title: 'Bird Watcher', how: 'Find 5 birds.', target: 5, measure: f => count(f, 'bird') },
  { id: 'bugs', emoji: '🐛', title: 'Bug Hunter', how: 'Find 5 bugs.', target: 5, measure: f => count(f, 'bug') },
  { id: 'trees', emoji: '🌳', title: 'Tree Hugger', how: 'Find 5 trees.', target: 5, measure: f => count(f, 'tree') },
  { id: 'flowers', emoji: '🌸', title: 'Flower Power', how: 'Find 5 flowers.', target: 5, measure: f => count(f, 'flower') },
  { id: 'rocks', emoji: '🪨', title: 'Rock Collector', how: 'Find 5 rocks.', target: 5, measure: f => count(f, 'rock') },
  { id: 'animals', emoji: '🐿️', title: 'Animal Tracker', how: 'Find 5 animals.', target: 5, measure: f => count(f, 'animal') },
  { id: 'water', emoji: '💧', title: 'Water Wizard', how: 'Find water 3 times.', target: 3, measure: f => count(f, 'water') },
  { id: 'sky', emoji: '☁️', title: 'Cloud Spotter', how: 'Look up and save the sky 3 times.', target: 3, measure: f => count(f, 'sky') },
  {
    id: 'rainbow', emoji: '🌈', title: 'Rainbow Finder', how: 'Find things of 7 different colours.', target: 7,
    measure: f => new Set(f.flatMap(x => x.colours)).size,
  },
  {
    id: 'everything', emoji: '🧭', title: 'One of Everything', how: 'Find one of every kind of thing.', target: COLLECTABLE.length,
    measure: f => COLLECTABLE.filter(c => f.some(x => x.category === c)).length,
  },
  { id: 'artist', emoji: '🎨', title: 'Nature Artist', how: 'Draw 3 pictures of your finds.', target: 3, measure: f => f.filter(x => x.hasDrawing).length },
  { id: 'story', emoji: '🎤', title: 'Storyteller', how: 'Record 3 voice notes.', target: 3, measure: f => f.filter(x => x.hasVoice).length },
  { id: 'photo', emoji: '📷', title: 'Photographer', how: 'Take 10 photos.', target: 10, measure: f => f.filter(x => x.hasPhoto).length },
  { id: 'tiny', emoji: '🔍', title: 'Tiny Detective', how: 'Find 3 tiny things.', target: 3, measure: f => f.filter(x => x.size === 'tiny').length },
  { id: 'lots', emoji: '💯', title: 'Counting Champ', how: 'Find lots and lots of something, 3 times.', target: 3, measure: f => f.filter(x => x.count === 'lots').length },
  {
    id: 'early', emoji: '🌅', title: 'Early Bird', how: 'Find something before 8 in the morning.', target: 1,
    measure: (f, c) => (f.some(x => c.hourOf(x.createdAt) < 8) ? 1 : 0),
  },
  {
    id: 'evening', emoji: '🌙', title: 'Night Owl', how: 'Find something after 7 in the evening.', target: 1,
    measure: (f, c) => (f.some(x => c.hourOf(x.createdAt) >= 19) ? 1 : 0),
  },
  {
    id: 'days3', emoji: '📅', title: 'Out and About', how: 'Explore on 3 different days.', target: 3,
    measure: (f, c) => new Set(f.map(x => c.dayOf(x.createdAt))).size,
  },
  {
    id: 'days7', emoji: '🗓️', title: 'Week of Wonder', how: 'Explore on 7 different days.', target: 7,
    measure: (f, c) => new Set(f.map(x => c.dayOf(x.createdAt))).size,
  },
  { id: 'hunt1', emoji: '🔎', title: 'Treasure Hunter', how: 'Finish a scavenger hunt.', target: 1, measure: (_f, _c, x) => x.huntsCompleted ?? 0 },
  { id: 'hunt3', emoji: '🗺️', title: 'Hunt Master', how: 'Finish 3 scavenger hunts.', target: 3, measure: (_f, _c, x) => x.huntsCompleted ?? 0 },
  {
    id: 'far', emoji: '🚀', title: 'Far Explorer', how: 'Find things more than 1 kilometre apart.', target: 1,
    measure: f => (farthestApartM(f) >= 1000 ? 1 : 0),
  },
];

/** The largest distance between any two located finds, in metres. */
export function farthestApartM(finds: BadgeFind[]): number {
  const pts = finds.filter(f => typeof f.lat === 'number' && typeof f.lon === 'number');
  let best = 0;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      best = Math.max(best, distanceM(pts[i].lat!, pts[i].lon!, pts[j].lat!, pts[j].lon!));
    }
  }
  return best;
}

export function badgeProgress(finds: BadgeFind[], clock: BadgeClock = LOCAL_CLOCK, extra: BadgeExtras = {}): BadgeProgress[] {
  return RULES.map(({ measure, ...b }) => {
    const value = Math.min(b.target, measure(finds, clock, extra));
    return { ...b, value, earned: value >= b.target };
  });
}

/** Badges earned by `after` that were not earned by `before`: what to celebrate. */
export function newlyEarned(
  before: BadgeFind[], after: BadgeFind[], clock: BadgeClock = LOCAL_CLOCK,
  extraBefore: BadgeExtras = {}, extraAfter: BadgeExtras = extraBefore,
): BadgeProgress[] {
  const had = new Set(badgeProgress(before, clock, extraBefore).filter(b => b.earned).map(b => b.id));
  return badgeProgress(after, clock, extraAfter).filter(b => b.earned && !had.has(b.id));
}

export function toBadgeFind(f: Find): BadgeFind {
  return {
    createdAt: f.createdAt, category: f.category, colours: f.colours, size: f.size, count: f.count,
    lat: f.lat, lon: f.lon, hasPhoto: !!f.photo, hasDrawing: !!f.drawing, hasVoice: !!f.voice,
  };
}

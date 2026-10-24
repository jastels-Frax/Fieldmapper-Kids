import type { GuideId } from './types.ts';

/**
 * Which of the device's speech voices sounds best. Browsers list every voice
 * the system has, and the default is often the oldest, most robotic one. Pure,
 * so it is tested without a browser.
 */
export interface VoiceLike {
  name: string;
  lang: string;
  localService: boolean;
  voiceURI: string;
  default?: boolean;
}

/** macOS / iOS novelty voices and old synthesizers: never chosen automatically. */
const NOVELTY = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|fred|good news|hysterical|jester|junior|kathy|organ|pipe organ|ralph|superstar|trinoids|whisper|wobble|zarvox|espeak|mbrola)\b/i;
/** Signs of a modern, natural-sounding voice. */
const NATURAL = /\b(natural|neural|premium|enhanced|online|wavenet|studio)\b/i;
/** Voices known to sound good, by name. */
const GOOD = /\b(samantha|ava|allison|susan|karen|daniel|moira|tessa|serena|kate|oliver|zoe|nicky|evan|joelle|siri|aria|jenny|guy|libby|sonia|ryan|clara|liam|google (us|uk) english)\b/i;

export function englishVoices<T extends VoiceLike>(voices: T[]): T[] {
  return voices.filter(v => /^en([-_]|$)/i.test(v.lang) && !NOVELTY.test(v.name));
}

export function voiceScore(v: VoiceLike, region = 'CA'): number {
  if (!/^en([-_]|$)/i.test(v.lang)) return -100;
  if (NOVELTY.test(v.name)) return -50;
  let s = 0;
  if (NATURAL.test(v.name)) s += 40;
  if (GOOD.test(v.name)) s += 25;
  const lang = v.lang.replace('_', '-').toUpperCase();
  if (lang === `EN-${region}`) s += 12;
  else if (lang === 'EN-US' || lang === 'EN-GB') s += 8;
  // An online voice stops talking with no signal, which is often the case outdoors.
  if (v.localService) s += 6;
  if (/compact/i.test(v.name)) s -= 10;
  if (v.default) s += 1;
  return s;
}

/** The chosen voice if it is still installed, else the best one, else none. */
export function pickVoice<T extends VoiceLike>(voices: T[], chosenURI?: string, region = 'CA'): T | null {
  if (chosenURI) {
    const c = voices.find(v => v.voiceURI === chosenURI);
    if (c) return c;
  }
  let best: T | null = null;
  let bestScore = -Infinity;
  for (const v of voices) {
    const sc = voiceScore(v, region);
    if (sc > bestScore) { best = v; bestScore = sc; }
  }
  return best && bestScore > -50 ? best : null;
}

// ── Character voices ─────────────────────────────────────────────


/**
 * How each character sounds: which kind of installed voice suits them, and a gentle pitch and
 * pace of their own. Pitch stays within 0.8–1.2: further than that, a natural voice turns into
 * the toy robot the single voice was chosen to get away from.
 */
export interface CharacterVoice {
  /** A higher or a deeper installed voice, where the device has both. */
  range: 'higher' | 'deeper' | 'any';
  pitch: number;
  rate: number;
}

export const CHARACTER_VOICES: Record<GuideId, CharacterVoice> = {
  frog: { range: 'higher', pitch: 1.15, rate: 1.03 },      // Hop: bright and bouncy
  rat: { range: 'higher', pitch: 1.2, rate: 1.06 },        // Pip: small and quick
  scout: { range: 'any', pitch: 1.0, rate: 0.96 },         // Scout the Survey Squirrel: calm, careful
  fox: { range: 'higher', pitch: 1.05, rate: 1.02 },       // Fern: lively
  moose: { range: 'deeper', pitch: 0.85, rate: 0.9 },      // Maple: slow and big
  bear: { range: 'deeper', pitch: 0.8, rate: 0.9 },        // Bramble: low and steady
  owl: { range: 'deeper', pitch: 0.92, rate: 0.9 },        // Hoot: thoughtful
  squirrel: { range: 'higher', pitch: 1.2, rate: 1.08 },   // Acorn: fast and chattery
  raccoon: { range: 'deeper', pitch: 1.05, rate: 1.04 },   // Bandit: sly and quick
};

/** Who gets first pick of the voices: the explorer's own buddies and Scout before the crew. */
const CAST_ORDER: GuideId[] = ['frog', 'rat', 'scout', 'fox', 'moose', 'bear', 'owl', 'squirrel', 'raccoon'];

/** Installed voices whose names say which way they lean (Apple, Google, Microsoft and the common Linux sets). */
const HIGHER = /\b(samantha|ava|allison|susan|karen|moira|tessa|serena|kate|zoe|nicky|joelle|aria|jenny|libby|sonia|clara|victoria|fiona|veena|emily|amy|emma|olivia|nora|natasha|female|woman|google us english|google uk english female)\b/i;
const DEEPER = /\b(daniel|oliver|evan|guy|ryan|liam|aaron|alex|tom|arthur|gordon|lee|rishi|thomas|william|brian|christopher|eric|male|man|google uk english male)\b/i;

export function voiceRange(name: string): 'higher' | 'deeper' | 'unknown' {
  if (DEEPER.test(name) && !/female|woman/i.test(name)) return 'deeper';
  if (HIGHER.test(name)) return 'higher';
  return 'unknown';
}

/**
 * A voice for every character from what this device has installed: different voices where there
 * are enough good ones, the same voice told apart by pitch and pace where there are not. Only the
 * good voices are cast (within 25 points of the best), so a character never gets a robotic one
 * just to be different. Deterministic, so Hop sounds the same every launch.
 */
export function castVoices<T extends VoiceLike>(voices: T[], region = 'CA'): Record<GuideId, T | null> {
  const ranked = voices.map(v => ({ v, s: voiceScore(v, region) })).filter(x => x.s > -50).sort((a, b) => b.s - a.s || a.v.name.localeCompare(b.v.name));
  const out = {} as Record<GuideId, T | null>;
  if (!ranked.length) { for (const g of CAST_ORDER) out[g] = null; return out; }
  const good = ranked.filter(x => x.s >= ranked[0].s - 25).map(x => x.v);
  const pools = { higher: good.filter(v => voiceRange(v.name) === 'higher'), deeper: good.filter(v => voiceRange(v.name) === 'deeper'), any: good };
  const used = new Map<T, number>();
  for (const g of CAST_ORDER) {
    const want = CHARACTER_VOICES[g].range;
    const pool = pools[want].length ? pools[want] : good;
    // The least-used voice in the pool, best first: spreads the voices out before any repeats.
    let pick = pool[0];
    for (const v of pool) if ((used.get(v) ?? 0) < (used.get(pick) ?? 0)) pick = v;
    used.set(pick, (used.get(pick) ?? 0) + 1);
    out[g] = pick;
  }
  return out;
}

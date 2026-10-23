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

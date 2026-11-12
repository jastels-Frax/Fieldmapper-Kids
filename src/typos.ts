/**
 * Typo-tolerant matching for the name searches (species.ts `searchSpecies`, habitats.ts `searchHabitats`). Pure.
 *
 * A departure from Field Mapper, whose species search (`InventorySpeciesSearch`) matches exact substrings only:
 * Scout's explorers are 5 to 10 and still learning to spell, so "ferrox" has to find the Ferox Begonia, "begnoia"
 * the begonias, "lobstr" the American Lobster and "elefant" the Elephant. A typo is one change: a letter added, left
 * out, changed, or two neighbours swapped (the restricted Damerau–Levenshtein, "optimal string alignment", distance),
 * counted after spelling by sound (`soundFold`).
 *
 * The typed words are matched against the START of any word of a name ("prinsess" finds Pink Princess Philodendron),
 * and only against as much of it as was typed, so a name is found while it is still being typed. Short words get no
 * tolerance (a three-letter word one letter off is a different word: cat, bat, rat), and the searches use these
 * matches only when the exact ones are few.
 */

/** How many typos a search of this many letters may carry: none under 4 letters, 1 up to 7, 2 from 8. */
export function typosAllowed(letters: number): number {
  return letters < 4 ? 0 : letters < 8 ? 1 : 2;
}

const WORD_CHAR = /[\p{L}\p{N}]/u;

/** Letters and digits only: what counts toward the length of a search. */
export function letterCount(q: string): number {
  return q.replace(/[^\p{L}\p{N}]/gu, '').length;
}

/**
 * Spelling by sound, applied to both sides before counting typos: "ph" is "f" and "ck" is "k", and a doubled letter
 * is one ("elefant" is Elephant, "racoon" Raccoon, "squirel" Squirrel) — the misspellings a child makes by ear, which
 * would otherwise cost two typos, or one that a short word cannot spare.
 */
export function soundFold(s: string): string {
  return s.replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/(\p{L})\1+/gu, '$1');
}

/**
 * The fewest typos that turn `q` into some beginning of `text`, or `max + 1` when it takes more than `max`. `text` is
 * read from `from`: the caller chooses where a word starts.
 */
export function prefixDistance(q: string, text: string, max: number, from = 0): number {
  const m = q.length;
  const n = Math.min(text.length - from, m + max);
  if (m === 0) return 0;
  // Rows over q, columns over text. prev2 is the row before prev, for a swap of two neighbours.
  let prev2: number[] = [];
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const row = new Array<number>(n + 1);
    row[0] = i;
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const t = text[from + j - 1];
      let d = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (q[i - 1] === t ? 0 : 1));
      if (i > 1 && j > 1 && q[i - 1] === text[from + j - 2] && q[i - 2] === t) d = Math.min(d, prev2[j - 2] + 1);
      row[j] = d;
      if (d < rowMin) rowMin = d;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = row;
  }
  // The best beginning of text: any length within `max` of the query's.
  let best = max + 1;
  for (let j = Math.max(0, m - max); j <= n; j++) best = Math.min(best, prev[j]);
  return best;
}

/** A name made ready for typo matching once, and kept: spelt by sound, with where each of its words starts. */
export interface Prepared {
  text: string;
  starts: number[];
}

/** `folded` is already lower case (the search's own fold). */
export function prepare(folded: string): Prepared {
  const text = soundFold(folded);
  const starts: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (WORD_CHAR.test(text[i]) && (i === 0 || !WORD_CHAR.test(text[i - 1]))) starts.push(i);
  }
  return { text, starts };
}

/** A search made ready once per keystroke: spelt by sound, with the typos its length allows (0 = none). */
export interface PreparedQuery {
  text: string;
  max: number;
}

export function prepareQuery(folded: string): PreparedQuery {
  return { text: soundFold(folded), max: typosAllowed(letterCount(folded)) };
}

/**
 * How many typos a search is from the start of a word of a name, or undefined when it is further than the search's
 * length allows (or too short to allow any). A word is tried only when it starts with the search's first letter, or
 * its first two swapped: a child rarely gets the first letter wrong, and trying every word of six thousand names on
 * every keystroke is too slow for an old tablet.
 */
export function typoDistanceTo(q: PreparedQuery, name: Prepared): number | undefined {
  if (!q.max) return undefined;
  const sq = q.text, st = name.text;
  let best = q.max + 1;
  for (const i of name.starts) {
    if (st[i] !== sq[0] && !(st[i] === sq[1] && st[i + 1] === sq[0])) continue;
    best = Math.min(best, prefixDistance(sq, st, q.max, i));
    if (best === 0) break;
  }
  return best <= q.max ? best : undefined;
}

/** The same, for one search and one name, both folded to lower case. */
export function typoDistance(q: string, text: string): number | undefined {
  return typoDistanceTo(prepareQuery(q), prepare(text));
}

/** The searches add typo matches only when the exact ones are fewer than this. */
export const TYPO_WHEN_FEWER = 10;

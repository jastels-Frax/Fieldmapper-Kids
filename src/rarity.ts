import type { SpeciesStatus } from './types.ts';

/**
 * Is a species rare? A find named as one gets the big celebration (screens.ts `celebrate`). Two lists decide it, the
 * ones Fraxinus's own surveys report against:
 *   - SOCI, a species of conservation interest: Field Mapper's `inventory/inventorySurvey.isSoCI`, ported unchanged —
 *     a provincial S-rank of S3 or rarer (S1, S2, S3; a range or a seasonal part after it counts by its first part:
 *     S3S4, S2?B, S1B,S4N), or a listing under the province's Endangered Species Act;
 *   - SARA: any status under Canada's Species at Risk Act (endangered, threatened, special concern, extirpated).
 * The statuses come from ACCDC through Field Mapper's species lists, and are kept on the find when the species is
 * picked (`SpeciesPick.status`), the way Field Mapper keeps a species record by value on an observation. Pure.
 */

/** Field Mapper's `isSoCI`, unchanged: an S1–S3 rank, or Endangered / Threatened / Vulnerable / Extirpated under the province's Act. */
export function isSoCI(rank?: string, provincial?: string): boolean {
  return /^S[123]($|[^0-9])/.test(rank || '') ||
    /^(Endangered|Threatened|Vulnerable|Extirpated)$/i.test(provincial || '');
}

/** A Species at Risk Act status in words, or undefined when there is none (Not at Risk and Data Deficient are none). */
export function saraWords(code?: string): string | undefined {
  switch ((code ?? '').split(',')[0].trim().toUpperCase()) {
    case 'E': return 'endangered';
    case 'T': return 'threatened';
    case 'SC': return 'of special concern';
    case 'X': case 'XT': return 'extirpated: gone from the wild in Canada';
    default: return undefined;
  }
}

/** Is a picked species rare? A name the explorer typed themselves carries no status, so never is. */
export function isRare(s?: SpeciesStatus): boolean {
  return !!s && (isSoCI(s.rank, s.prov) || !!saraWords(s.sara));
}

/** What a list species carries into a pick: its statuses, or undefined when it has none. */
export function statusOf(sp: { r?: string; p?: string; f?: string; w?: string }): SpeciesStatus | undefined {
  const s: SpeciesStatus = {
    ...(sp.r ? { rank: sp.r } : {}),
    ...(sp.p ? { prov: sp.p } : {}),
    ...(sp.f ? { sara: sp.f } : {}),
    ...(sp.w ? { where: sp.w } : {}),
  };
  return s.rank || s.prov || s.sara ? s : undefined;
}

/**
 * Why a find is rare, in a child's words: one line for the rank, one for each list it is on. Each is true of its
 * source, and nothing is claimed that the lists do not say (no "protected by law": what a listing protects depends on
 * the species and the land). `where` is the province the list's ranks are for; a list a grown-up imported may be
 * another province's, so its finds say "this province".
 */
export function rareLines(s: SpeciesStatus): string[] {
  const where = s.where ?? 'this province';
  const Where = where[0].toUpperCase() + where.slice(1);
  const lines: string[] = [];
  const rank = s.rank ?? '';
  if (/^S[123]($|[^0-9])/.test(rank)) {
    // Every part of the rank that is ranked at all (S1–S5; SU and SNA say nothing). The rarest digit says how rare.
    const parts = rank.split(',').map(p => p.trim()).filter(p => /^S[1-5]/.test(p));
    const rare = parts.filter(p => /^S[123]/.test(p));
    const digit = Math.min(...rare.map(p => Number(p[1])));
    const few = digit === 1 ? 'Very few' : digit === 2 ? 'Only a few' : 'Not many';
    // Rare in one season only (S1B,S4N: rare as a breeder, common on the way through): say which season.
    const season = rare.length < parts.length ? /^S[123](?:S[1-5])?\??([BNM])/.exec(rare[0])?.[1] : undefined;
    if (season === 'B') lines.push(`${few} of these breed in ${where}.`);
    else if (season === 'N') lines.push(`${few} of these stay in ${where} outside the breeding season.`);
    else if (season === 'M') lines.push(`${few} of these pass through ${where} on migration.`);
    else if (digit === 1) lines.push(`One of the rarest living things in ${where}.`);
    else if (digit === 2) lines.push(`Rare in ${where}: only a few places have it.`);
    else lines.push(`Uncommon in ${where}: not many places have it.`);
  }
  if (/^(Endangered|Threatened|Vulnerable|Extirpated)$/i.test(s.prov ?? '')) {
    const word = s.prov!.toLowerCase();
    lines.push(`${Where}'s list of species at risk says it is ${word === 'extirpated' ? `extirpated: thought to be gone from ${where}` : word}.`);
  }
  const sara = saraWords(s.sara);
  if (sara) lines.push(`Canada's list of species at risk says it is ${sara}.`);
  return lines;
}

/** Bramble's line under every rare find: what to do now. */
export const RARE_CARE = 'Leave it just as you found it, and tell a grown-up about it.';

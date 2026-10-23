#!/usr/bin/env node
/**
 * Copies Field Mapper's species lists into Scout.
 *
 *   node scripts/import-fieldmapper-species.mjs --from ../GPS2026felt [--region ns]
 *
 * Field Mapper keeps ACCDC species lists in public/db/db-<group>.json (Nova
 * Scotia) and db-<region>-<group>.json (nb, pe, nl, lb). This reads one
 * region's files and writes public/species/<region>.json in Scout's slim form
 * (see src/species.ts), keeping what a child could plausibly meet:
 *   - named species only (no "bat species" placeholders, no lower-case group rows);
 *   - not accidental, doubtful, unconfirmed, false reports, absent or hybrid records;
 *   - invertebrates only where ACCDC has ranked them (not SU), or there are thousands;
 *   - one record per common name and taxon (subspecies fold into the species).
 * Re-run it to refresh; never hand-edit the output.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const from = resolve(arg('--from', '../GPS2026felt'));
const region = arg('--region', 'ns');
const groups = ['vertebrates', 'vascular', 'nonvascular', 'invertebrates'];
const SKIP = new Set(['Accidental', 'FalseReport', 'Doubtful', 'Absent', 'Unconfirmed', 'Hybrid']);

const out = [];
const sources = [];
// Subspecies share a common name; a child picks the name, so keep the first of each.
const seen = new Set();
for (const g of groups) {
  const file = join(from, 'public/db', region === 'ns' ? `db-${g}.json` : `db-${region}-${g}.json`);
  if (!existsSync(file)) { console.warn(`skip ${file} (not in Field Mapper for ${region})`); continue; }
  const rows = JSON.parse(readFileSync(file, 'utf8'));
  let kept = 0;
  for (const r of rows) {
    const n = (r.commonName ?? '').trim();
    if (!n || !/^[A-Z]/.test(n) || !r.scientificName || !r.taxon) continue;
    const words = String(r.noteRank ?? '').split(/\s+/);
    if (words.some(w => SKIP.has(w))) continue;
    if (g === 'invertebrates' && String(r.srank ?? '').startsWith('SU')) continue;
    const key = `${n.toLowerCase()}|${r.taxon}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ n, s: r.scientificName, t: r.taxon, ...(r.elcode ? { c: r.elcode } : {}), ...(r.srank ? { r: r.srank } : {}), ...(words.includes('Exotic') ? { x: true } : {}) });
    kept++;
  }
  sources.push(`${g}: ${kept} of ${rows.length}`);
}
if (!out.length) { console.error('Nothing read; is --from a Field Mapper checkout?'); process.exit(1); }
let commit = 'unknown';
try { commit = execSync('git rev-parse --short HEAD', { cwd: from }).toString().trim(); } catch { /* not a git checkout */ }
const doc = { region, source: `Fraxinus Field Mapper ${commit} (ACCDC species ranks)`, generated: new Date().toISOString().slice(0, 10), species: out };
writeFileSync(join('public/species', `${region}.json`), JSON.stringify(doc));
console.log(`${region}: ${out.length} species (${sources.join(', ')}) from ${commit}`);

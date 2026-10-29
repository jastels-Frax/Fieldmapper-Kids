import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { searchSpecies, parseFieldMapperList, parseSpeciesCsv, mergeLists, hasSpeciesStep, taxaFor, type Species } from '../src/species.ts';
import type { CategoryId } from '../src/types.ts';
import { FAMILIAR } from '../src/familiar.ts';

const ns = JSON.parse(readFileSync(new URL('../public/species/ns.json', import.meta.url), 'utf8')) as { species: Species[] };

test('the shipped list is Field Mapper\'s, slimmed and without duplicates', () => {
  assert.ok(ns.species.length > 5000);
  const keys = ns.species.map(s => `${s.n.toLowerCase()}|${s.t}`);
  assert.equal(new Set(keys).size, keys.length);
  for (const s of ns.species.slice(0, 50)) assert.ok(s.n && s.t);
});

test('every familiar species is a real list entry', () => {
  const names = new Set(ns.species.map(s => s.n));
  for (const [cat, list] of Object.entries(FAMILIAR)) {
    for (const n of list!) assert.ok(names.has(n), `${cat}: ${n}`);
  }
});

test('a familiar species is one its kind can name (search finds it under that kind)', () => {
  const taxon = new Map(ns.species.map(s => [s.n, s.t] as const));
  for (const [cat, list] of Object.entries(FAMILIAR)) {
    const taxa = taxaFor(cat as CategoryId);
    for (const n of list!) assert.ok(!taxa || taxa.includes(taxon.get(n)!), `${cat}: ${n} is ${taxon.get(n)}`);
  }
});

test('the new kinds put their own kind of living thing first', () => {
  assert.equal(searchSpecies(ns.species, 'crusty', 'map')[0].t, 'Lichen');
  assert.equal(searchSpecies(ns.species, 'shelf', 'turkey')[0].n, 'Turkey Tail');
  assert.equal(searchSpecies(ns.species, 'snail', 'garden')[0].t, 'Mollusc');
  // A place is not a species.
  for (const k of ['forest', 'meadow', 'wetland', 'beach', 'habitat', 'rock', 'sky'] as const) assert.equal(hasSpeciesStep(k), false, k);
  assert.equal(hasSpeciesStep('water'), true);
});

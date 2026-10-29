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

test('the new kinds name only their own kind of living thing', () => {
  assert.ok(searchSpecies(ns.species, 'crusty', 'map').every(s => s.t === 'Lichen'));
  assert.ok(searchSpecies(ns.species, 'shelf', 'turkey').some(s => s.n === 'Turkey Tail'));
  assert.ok(searchSpecies(ns.species, 'fern', '').every(s => s.t === 'Fern / Fern Ally'));
  assert.ok(searchSpecies(ns.species, 'snail', '').every(s => s.t === 'Mollusc'));
  // A lichen is not a plant: it has a group of its own now.
  assert.ok(searchSpecies(ns.species, 'plant', 'reindeer lichen').every(s => s.t !== 'Lichen'));
  // A place is not a species.
  for (const k of ['forest', 'meadow', 'wetland', 'beach', 'habitat', 'rock', 'sky'] as const) assert.equal(hasSpeciesStep(k), false, k);
  assert.equal(hasSpeciesStep('water'), true);
});

test('search is limited to the find\'s kind and puts name starts first', () => {
  const birds = searchSpecies(ns.species, 'bird', 'blue');
  assert.ok(birds.length);
  assert.ok(birds.every(s => s.t === 'Bird'));
  assert.equal(birds[0].n.toLowerCase().startsWith('blue'), true);
  assert.ok(searchSpecies(ns.species, 'animal', 'red fox').some(s => s.n === 'Red Fox'));
  assert.deepEqual(searchSpecies(ns.species, 'rock', 'fox'), []);
  assert.equal(hasSpeciesStep('rock'), false);
  assert.equal(hasSpeciesStep('sign'), true);
});

test('a Field Mapper file is read, and junk is refused with a reason', () => {
  const l = parseFieldMapperList([{ commonName: 'Moose', scientificName: 'Alces alces', taxon: 'Mammal', elcode: 'AMALC03010', srank: 'S1', noteRank: 'Exotic' }, { foo: 1 }]);
  assert.deepEqual(l, [{ n: 'Moose', t: 'Mammal', s: 'Alces alces', c: 'AMALC03010', r: 'S1', x: true }]);
  assert.equal(typeof parseFieldMapperList({}), 'string');
  assert.equal(typeof parseFieldMapperList([{ foo: 1 }]), 'string');
});

test('a CSV is read with or without a header', () => {
  assert.deepEqual(parseSpeciesCsv('Common name,Scientific,Taxon\n"Fox, Red",Vulpes vulpes,Mammal\nOak,,'),
    [{ n: 'Fox, Red', s: 'Vulpes vulpes', t: 'Mammal' }, { n: 'Oak', t: 'Other' }]);
  assert.equal(typeof parseSpeciesCsv('\n\n'), 'string');
});

test('merging keeps the first of a duplicate', () => {
  const a = [{ n: 'Moose', t: 'Mammal', s: 'Alces alces', r: 'S1' }];
  const b = [{ n: 'moose', t: 'Mammal', s: 'Alces alces' }, { n: 'Elk', t: 'Mammal' }];
  assert.deepEqual(mergeLists(a, b).map(s => s.n), ['Moose', 'Elk']);
});

test('mushrooms have their own list, and fungi left the plant list', () => {
  const m = searchSpecies(ns.species, 'mushroom', 'amanita', 100);
  assert.ok(m.length > 10);
  assert.ok(m.every(s => s.t === 'Fungus'));
  assert.ok(searchSpecies(ns.species, 'plant', 'amanita', 100).every(s => s.t !== 'Fungus'));
});

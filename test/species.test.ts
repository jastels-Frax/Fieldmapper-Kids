import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { searchSpecies, parseFieldMapperList, parseSpeciesCsv, mergeLists, hasSpeciesStep, type Species } from '../src/species.ts';
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

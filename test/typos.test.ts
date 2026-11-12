import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TYPO_WHEN_FEWER, prefixDistance, soundFold, typoDistance, typosAllowed } from '../src/typos.ts';
import { mergeLists, searchSpecies, type Species } from '../src/species.ts';
import { BUILT_IN } from '../src/builtIns.ts';
import { searchHabitats } from '../src/habitats.ts';

const ns = JSON.parse(readFileSync(new URL('../public/species/ns.json', import.meta.url), 'utf8')) as { species: Species[] };
const all = mergeLists(ns.species, [...BUILT_IN]);
const first = (cat: Parameters<typeof searchSpecies>[1], q: string) => searchSpecies(all, cat, q, 30)[0]?.n;

test('short words get no typos; longer ones one, then two', () => {
  assert.deepEqual([1, 3, 4, 7, 8, 20].map(typosAllowed), [0, 0, 1, 1, 2, 2]);
});

test('a typo is a letter added, left out, changed, or two neighbours swapped, against the start of the text', () => {
  assert.equal(prefixDistance('ferox', 'ferox begonia', 1), 0);
  assert.equal(prefixDistance('ferrox', 'ferox begonia', 1), 1, 'one added');
  assert.equal(prefixDistance('lobstr', 'lobster', 1), 1, 'one left out');
  assert.equal(prefixDistance('mople', 'maple', 1), 1, 'one changed');
  assert.equal(prefixDistance('begnoia', 'begonia', 1), 1, 'two swapped');
  assert.equal(prefixDistance('bxgnxia', 'begonia', 1), 2, 'too far: max + 1');
  // Only as much of the text as was typed: a name is found while it is still being typed.
  assert.equal(prefixDistance('kangr', 'kangaroo', 1), 1);
});

test('spelling by sound: ph is f, ck is k, a double letter is one', () => {
  assert.equal(soundFold('elephant'), 'elefant');
  assert.equal(soundFold('raccoon'), 'racon');
  assert.equal(soundFold('chickadee'), 'chikade');
  assert.equal(typoDistance('elefant', 'elephant'), 0);
  assert.equal(typoDistance('racoon', 'raccoon'), 0);
  assert.equal(typoDistance('squirel', 'red squirrel'), 0);
});

test('a search matches the start of any word, and needs its first letter (or the first two swapped)', () => {
  assert.equal(typoDistance('prinsess', 'pink princess philodendron'), 1);
  assert.equal(typoDistance('ebgonia', 'rex begonia'), 1, 'first two swapped');
  assert.equal(typoDistance('vegonia', 'rex begonia'), undefined, 'first letter wrong');
  assert.equal(typoDistance('cta', 'cat'), undefined, 'three letters: no typos');
  assert.equal(typoDistance('kangeroo', 'kangaroo'), 1);
  assert.equal(typoDistance('xylophone', 'kangaroo'), undefined);
});

test('misspelt names are found', () => {
  assert.equal(first('houseplant', 'ferrox'), 'Ferox Begonia');
  assert.equal(first('houseplant', 'begnoia')?.endsWith('Begonia'), true);
  assert.equal(first('animal', 'lobstr'), 'American Lobster');
  assert.equal(first('animal', 'elefant'), 'Elephant');
  assert.equal(first('animal', 'kangeroo'), 'Kangaroo');
  assert.equal(first('mammal', 'racoon'), 'Raccoon');
  assert.equal(first('mammal', 'squirel')?.endsWith('Squirrel'), true);
  assert.equal(first('bird', 'chikadee'), 'Black-capped Chickadee');
  assert.equal(first('houseplant', 'thai constelation'), 'Thai Constellation Monstera');
  assert.equal(first('houseplant', 'pink prinsess'), 'Pink Princess Philodendron');
  assert.equal(first('tree', 'mapel')?.endsWith('Maple'), true);
  // The scientific name too.
  assert.equal(first('houseplant', 'monstera delicosa'), 'Monstera');
});

test('a misspelt name of the find\'s own kind comes before other kinds\' exact matches', () => {
  // "robbin" is inside Robbins' Pondweed (a plant); on a Bird find, American Robin comes first.
  assert.equal(first('bird', 'robbin'), 'American Robin');
  // And it never jumps an exact match of its own kind.
  assert.equal(first('animal', 'cat'), 'Cat');
  assert.equal(first('shelf', 'turkey'), 'Turkey Tail');
});

test('typo matches only fill in when the exact ones are few', () => {
  const fold = (s: string) => s.toLowerCase();
  const maples = searchSpecies(all, 'tree', 'maple', 30);
  assert.ok(maples.length >= TYPO_WHEN_FEWER);
  for (const sp of maples) assert.ok(fold(sp.n).includes('maple') || fold(sp.s ?? '').includes('maple'), sp.n);
});

test('kinds of place are found misspelt too', () => {
  assert.equal(searchHabitats('swomp', 'wetland')[0]?.name, 'Swamp');
  assert.equal(searchHabitats('medow', 'meadow')[0]?.name, 'Meadow');
  assert.equal(searchHabitats('bog', 'wetland')[0]?.name, 'Bog');
});

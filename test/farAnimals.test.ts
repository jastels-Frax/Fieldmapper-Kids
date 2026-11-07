import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FAR_ANIMALS, FAR_WORDS } from '../src/farAnimals.ts';
import { mergeLists, searchSpecies, belongsTo, type Species } from '../src/species.ts';
import { TAXON_KIND, kindForSpecies, kindToOffer } from '../src/speciesKind.ts';
import { groupOf } from '../src/categories.ts';
import { isRare, statusOf } from '../src/rarity.ts';

const ns = JSON.parse(readFileSync(new URL('../public/species/ns.json', import.meta.url), 'utf8')) as { species: Species[] };
const all = mergeLists(ns.species, [...FAR_ANIMALS]);

test('every animal not wild here has a unique name that the province\'s list does not carry', () => {
  const mine = FAR_ANIMALS.map(sp => sp.n.toLowerCase());
  assert.equal(new Set(mine).size, mine.length, 'a name is listed twice');
  const listed = new Set(ns.species.map(sp => sp.n.toLowerCase()));
  for (const n of mine) assert.ok(!listed.has(n), `${n} is already on the Nova Scotia list`);
  // So merging never drops one.
  assert.equal(all.length, ns.species.length + FAR_ANIMALS.length);
});

test('each is an animal, in a set, with no species-level claims', () => {
  for (const sp of FAR_ANIMALS) {
    const kind = TAXON_KIND[sp.t];
    assert.ok(kind, `${sp.n}: taxon ${sp.t} names no kind`);
    assert.equal(groupOf(kind)?.id, 'animals', `${sp.n} is not in the animal group`);
    assert.equal(kindForSpecies(sp), kind);
    assert.ok(sp.o === 'away' || sp.o === 'pet', `${sp.n}: no set`);
    assert.equal(sp.x, true);
    for (const k of ['s', 'c', 'r', 'p', 'f', 'w'] as const) assert.equal(sp[k], undefined, `${sp.n} carries ${k}`);
    // Never rare: there is no rank or status to read.
    assert.equal(statusOf(sp), undefined);
    assert.equal(isRare(statusOf(sp)), false);
    if (sp.e !== undefined) assert.ok(sp.e.trim().length > 0, `${sp.n}: blank emoji`);
  }
});

test('names fit a chip, and both sets have words', () => {
  for (const sp of FAR_ANIMALS) assert.ok(sp.n.length <= 22, `${sp.n} is too long for a chip`);
  assert.ok(FAR_ANIMALS.some(sp => sp.o === 'away') && FAR_ANIMALS.some(sp => sp.o === 'pet'));
  for (const w of Object.values(FAR_WORDS)) assert.ok(w.tab.length <= 12 && w.emoji && w.tag);
});

test('search finds them by their everyday names', () => {
  assert.equal(searchSpecies(all, 'mammal', 'kangaroo')[0].n, 'Kangaroo');
  assert.equal(searchSpecies(all, 'animal', 'kang')[0].n, 'Kangaroo');
  assert.equal(searchSpecies(all, 'bird', 'penguin')[0].n, 'Penguin');
  assert.equal(searchSpecies(all, 'animal', 'panda')[0].o, 'away');
});

test('the very name typed comes first within the find\'s kind, never past it', () => {
  // Cat before Feral Cat; Dog before the plants called Dog-something, even for "Other", which names anything.
  assert.equal(searchSpecies(all, 'animal', 'cat')[0].n, 'Cat');
  assert.equal(searchSpecies(all, 'other', 'dog')[0].n, 'Dog');
  assert.equal(searchSpecies(all, 'bird', 'turkey')[0].n, 'Turkey');
  // A Shelf find typing "turkey" on the way to Turkey Tail keeps the mushroom first.
  assert.equal(searchSpecies(all, 'shelf', 'turkey')[0].n, 'Turkey Tail');
  // The list's own answers are unchanged by the merge.
  assert.equal(searchSpecies(all, 'crusty', 'map')[0].t, 'Lichen');
  assert.equal(searchSpecies(all, 'snail', 'garden')[0].t, 'Mollusc');
});

test('a kind is offered the way it is for any species', () => {
  const by = new Map(FAR_ANIMALS.map(sp => [sp.n, sp] as const));
  assert.equal(kindToOffer('animal', by.get('Kangaroo')!), undefined);
  assert.equal(kindToOffer('animal', by.get('Penguin')!), 'bird');
  assert.equal(kindToOffer('other', by.get('Dog')!), 'mammal');
  assert.equal(kindToOffer('bug', by.get('Tarantula')!), undefined);
  assert.ok(belongsTo('sign', by.get('Dog')!.t), 'a dog\'s tracks are animal clues');
});

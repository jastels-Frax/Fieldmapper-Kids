import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUILT_IN } from '../src/builtIns.ts';
import { FAR_ANIMALS } from '../src/farAnimals.ts';
import { SEA_LIFE } from '../src/seaLife.ts';
import { HOUSEPLANTS } from '../src/houseplants.ts';
import { CATEGORY_TAXA, SET_ORDER, SET_WORDS, belongsTo, hasSpeciesStep, mergeLists, searchSpecies, type Species } from '../src/species.ts';
import { TAXON_KIND, kindForSpecies, kindToOffer } from '../src/speciesKind.ts';
import { categoryOf, groupOf, isKind } from '../src/categories.ts';
import { isRare, statusOf } from '../src/rarity.ts';

const ns = JSON.parse(readFileSync(new URL('../public/species/ns.json', import.meta.url), 'utf8')) as { species: Species[] };
const all = mergeLists(ns.species, [...BUILT_IN]);
const by = new Map(BUILT_IN.map(sp => [sp.n, sp] as const));
const first = (cat: Parameters<typeof searchSpecies>[1], q: string) => searchSpecies(all, cat, q)[0].n;

test('every built-in name is unique, and none is a name the province\'s list carries', () => {
  const mine = BUILT_IN.map(sp => sp.n.toLowerCase());
  assert.equal(new Set(mine).size, mine.length, 'a name is listed twice');
  const listed = new Set(ns.species.map(sp => sp.n.toLowerCase()));
  for (const n of mine) assert.ok(!listed.has(n), `${n} is already on the Nova Scotia list`);
  // So merging never drops one.
  assert.equal(all.length, ns.species.length + BUILT_IN.length);
  assert.equal(BUILT_IN.length, SEA_LIFE.length + HOUSEPLANTS.length + FAR_ANIMALS.length);
});

test('each is in a set, has a kind that can name it, and makes no claim a list would', () => {
  for (const sp of BUILT_IN) {
    assert.ok(sp.o && SET_ORDER.includes(sp.o), `${sp.n}: no set`);
    const kind = kindForSpecies(sp);
    assert.ok(kind, `${sp.n}: no kind`);
    assert.equal(categoryOf(kind).id, kind);
    // Either its taxon names its kind, or the set names the kind outright and that kind lists the taxon.
    assert.ok(sp.k ? CATEGORY_TAXA[sp.k]?.includes(sp.t) : TAXON_KIND[sp.t] === kind, `${sp.n}: ${sp.t} vs ${kind}`);
    for (const k of ['c', 'r', 'p', 'f', 'w'] as const) assert.equal(sp[k], undefined, `${sp.n} carries ${k}`);
    // Never rare: there is no rank or status to read.
    assert.equal(statusOf(sp), undefined);
    assert.equal(isRare(statusOf(sp)), false);
    if (sp.e !== undefined) assert.ok(sp.e.trim().length > 0, `${sp.n}: blank emoji`);
    // A genus, a species or hybrid (×), a variety (var.), and a cultivar in quotes ('Thai Constellation'), and nothing else.
    if (sp.s !== undefined) assert.match(sp.s, /^[A-Z][a-z]+( × [a-z-]+| [a-z-]+)?( var\. [a-z-]+)?( '[A-Z][A-Za-z ]+')?$/, `${sp.n}: ${sp.s} is not a scientific name`);
    // Long enough for "Prince of Orange Philodendron": a chip wraps its words rather than run past its box.
    assert.ok(sp.n.length <= 30, `${sp.n} is too long for a chip`);
  }
});

test('the sets are what they say', () => {
  for (const sp of FAR_ANIMALS) {
    assert.ok(sp.o === 'away' || sp.o === 'pet', sp.n);
    assert.equal(groupOf(kindForSpecies(sp)!)?.id, 'animals', sp.n);
    assert.equal(sp.s, undefined, `${sp.n}: an everyday name is not a species`);
    assert.equal(sp.x, true);
  }
  for (const sp of SEA_LIFE) {
    assert.equal(sp.o, 'sea');
    assert.equal(kindForSpecies(sp), 'sea', sp.n);
  }
  for (const sp of HOUSEPLANTS) {
    assert.equal(sp.o, 'home');
    assert.equal(kindForSpecies(sp), 'houseplant', sp.n);
  }
  assert.ok(HOUSEPLANTS.length >= 60);
  for (const o of SET_ORDER) {
    const w = SET_WORDS[o];
    assert.ok(w.tab.length <= 12 && w.emoji && w.pic && w.tag && w.list, o);
    assert.ok(BUILT_IN.some(sp => sp.o === o), `${o} is empty`);
  }
});

test('a lobster is a sea animal, never a bug, and is found by "lobster"', () => {
  const lobster = by.get('American Lobster')!;
  assert.equal(kindForSpecies(lobster), 'sea');
  assert.equal(isKind('sea', 'animal'), true, 'a sea animal counts as an animal');
  assert.equal(kindToOffer('animal', lobster), 'sea');
  assert.equal(kindToOffer('other', lobster), 'sea');
  assert.equal(kindToOffer('sea', lobster), undefined);
  assert.equal(first('sea', 'lobster'), 'American Lobster');
  assert.equal(first('animal', 'lobster'), 'American Lobster');
  // The mushroom stays first where a mushroom is wanted.
  assert.equal(first('mushroom', 'lobster'), 'Lobster Mushroom');
  assert.match(first('sea', 'crab'), / Crab$/);
  assert.deepEqual(searchSpecies(all, 'sea', 'jelly').slice(0, 2).map(sp => sp.t), ['Cnidarian', 'Cnidarian']);
});

test('a houseplant has a name step now, and finds its names', () => {
  assert.equal(hasSpeciesStep('houseplant'), true);
  assert.equal(first('houseplant', 'spider'), 'Spider Plant');
  assert.equal(first('houseplant', 'monstera'), 'Monstera');
  assert.equal(first('houseplant', 'Ficus elastica'), 'Rubber Plant');
  assert.equal(kindToOffer('plant', by.get('Snake Plant')!), 'houseplant');
  assert.equal(kindToOffer('houseplant', by.get('Snake Plant')!), undefined);
  assert.ok(belongsTo('houseplant', 'Houseplant'));
});

test('named varieties are found by the variety or by the plant', () => {
  assert.equal(first('houseplant', 'thai'), 'Thai Constellation Monstera');
  assert.equal(first('houseplant', 'Thai Constellation'), 'Thai Constellation Monstera');
  // The plant's own name stays first, its varieties right after it.
  const monsteras = searchSpecies(all, 'houseplant', 'monstera').map(sp => sp.n);
  assert.equal(monsteras[0], 'Monstera');
  for (const n of ['Thai Constellation Monstera', 'Albo Monstera', 'Mini Monstera']) assert.ok(monsteras.includes(n), n);
  assert.equal(first('houseplant', 'marble'), 'Marble Queen Pothos');
  assert.equal(first('houseplant', 'pink princess'), 'Pink Princess Philodendron');
  // Begonias: by kind or by name, the plain Rex Begonia first among equals.
  const begonias = searchSpecies(all, 'houseplant', 'begonia').map(sp => sp.n);
  for (const n of ['Rex Begonia', 'Angel Wing Begonia', 'Ferox Begonia', 'Polka Dot Begonia', 'Iron Cross Begonia']) assert.ok(begonias.includes(n), n);
  assert.equal(first('houseplant', 'angel'), 'Angel Wing Begonia');
  assert.equal(first('houseplant', 'ferox'), 'Ferox Begonia');
  assert.equal(by.get('Ferox Begonia')!.s, 'Begonia ferox');
  // A cultivar keeps its parent's scientific name.
  assert.equal(by.get('Thai Constellation Monstera')!.s, "Monstera deliciosa 'Thai Constellation'");
  // The big buttons stay the commonest plants, not varieties.
  assert.ok(HOUSEPLANTS.slice(0, SET_WORDS.home.chips).every(sp => !/'/.test(sp.s ?? '')));
});

test('everyday animals are found by their names, the very name first within the kind', () => {
  assert.equal(first('mammal', 'kangaroo'), 'Kangaroo');
  assert.equal(first('animal', 'kang'), 'Kangaroo');
  assert.equal(first('bird', 'penguin'), 'Penguin');
  assert.equal(first('animal', 'cat'), 'Cat');
  assert.equal(first('other', 'dog'), 'Dog');
  assert.equal(first('bird', 'turkey'), 'Turkey');
  assert.equal(first('shelf', 'turkey'), 'Turkey Tail');
  // The list's own answers are unchanged by the merge.
  assert.equal(searchSpecies(all, 'crusty', 'map')[0].t, 'Lichen');
  assert.equal(searchSpecies(all, 'snail', 'garden')[0].t, 'Mollusc');
  assert.equal(kindToOffer('animal', by.get('Kangaroo')!), undefined);
  assert.equal(kindToOffer('animal', by.get('Penguin')!), 'bird');
  assert.equal(kindToOffer('bug', by.get('Tarantula')!), undefined);
  assert.ok(belongsTo('sign', by.get('Dog')!.t), 'a dog\'s tracks are animal clues');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, GROUPS, categoryOf, findName, groupOf, isKind, kindWords, kindsOf, oneOf } from '../src/categories.ts';
import { KIND_ART_IDS, kindArt } from '../src/kindArt.ts';

test('every kind is in exactly one group, except "Other" and the old mystery', () => {
  assert.equal(new Set(CATEGORIES.map(c => c.id)).size, CATEGORIES.length);
  const listed = GROUPS.flatMap(g => g.kinds);
  assert.equal(new Set(listed).size, listed.length, 'a kind listed twice');
  for (const c of CATEGORIES) {
    if (c.id === 'mystery' || c.id === 'other') { assert.equal(c.group, undefined); continue; }
    const g = GROUPS.find(x => x.id === c.group);
    assert.ok(g, `${c.id} has no group`);
    assert.ok(g.kinds.includes(c.id), `${c.id} is not in ${g.id}'s list`);
    assert.equal(groupOf(c.id), g);
  }
  for (const g of GROUPS) for (const k of g.kinds) assert.equal(categoryOf(k).id, k, `${g.id}: unknown kind ${k}`);
});

test('a group\'s own kind ("Just a plant") is in it, and offered last', () => {
  for (const g of GROUPS) {
    assert.equal(categoryOf(g.generic).group, g.id, g.id);
    assert.equal(kindsOf(g).at(-1)!.id, g.generic, g.id);
    assert.ok(categoryOf(g.generic).pick, `${g.generic} needs its button words`);
    // "Not sure" left "What is it?" in 2.10: "Other" covers it, so no button says it.
    assert.notEqual(categoryOf(g.generic).pick, 'Not sure', g.id);
  }
});

test('a kind refines a kind of its own group, one level deep', () => {
  for (const c of CATEGORIES.filter(x => x.refines)) {
    const parent = categoryOf(c.refines!);
    assert.equal(parent.id, c.refines, `${c.id} refines an unknown kind`);
    assert.equal(parent.group, c.group, `${c.id} and ${parent.id} are in different groups`);
    assert.equal(parent.refines, undefined, `${parent.id} refines too: one level only`);
  }
});

test('every kind has something to say, and a sentence that reads', () => {
  for (const c of CATEGORIES) {
    assert.ok(c.cheer && c.talk.length >= 2 && c.facts.length >= 2, c.id);
    assert.match(oneOf(c), /^(a|an|some|the|something) [a-z]/, c.id);
  }
  assert.equal(oneOf(categoryOf('animal')), 'an animal');
  assert.equal(oneOf(categoryOf('crusty')), 'a crusty lichen');
  assert.equal(oneOf(categoryOf('water')), 'some water');
  assert.equal(oneOf(categoryOf('other')), 'something else');
});

test('kindWords names the group only when it adds something', () => {
  assert.equal(kindWords(categoryOf('shelf')), 'Shelf · Mushroom');
  assert.equal(kindWords(categoryOf('plant')), 'Plant');
  assert.equal(kindWords(categoryOf('mystery')), 'Mystery');
});

test('isKind: a fern is a plant, a shelf a mushroom, and the old kinds are untouched', () => {
  assert.equal(isKind('fern', 'plant'), true);
  assert.equal(isKind('shelf', 'mushroom'), true);
  assert.equal(isKind('mammal', 'animal'), true);
  assert.equal(isKind('crusty', 'lichen'), true);
  assert.equal(isKind('plant', 'plant'), true);
  // A tree and a bird kept their own meaning: they never counted as "a plant" or "an animal", and still do not.
  assert.equal(isKind('tree', 'plant'), false);
  assert.equal(isKind('bird', 'animal'), false);
  assert.equal(isKind('plant', 'fern'), false);
});

test('every drawing a kind names exists, and is our own plain markup', () => {
  const named = [...CATEGORIES.map(c => c.art), ...GROUPS.map(g => g.art)].filter((a): a is string => !!a);
  for (const a of named) assert.ok(kindArt(a), a);
  for (const id of KIND_ART_IDS) {
    const svg = kindArt(id)!;
    assert.match(svg, /^<svg viewBox="0 0 64 64"/, id);
    assert.doesNotMatch(svg, /<script|\son\w+=|href=|<image|<foreignObject/i, id);
  }
  assert.equal(kindArt(undefined), undefined);
  assert.equal(kindArt('nope'), undefined);
});

test('a find is called by its own name, then its species, then its kind', () => {
  assert.equal(findName({ category: 'plant', nickname: 'Sammy', species: { name: 'Red Maple' } }), 'Sammy');
  assert.equal(findName({ category: 'plant', species: { name: 'Red Maple' } }), 'Red Maple');
  assert.equal(findName({ category: 'plant', species: { name: 'little plant' } }), 'little plant');
  assert.equal(findName({ category: 'shelf' }), 'Shelf mushroom');
  assert.equal(findName({ category: 'forest', habitat: { name: 'Softwood forest' } }), 'Softwood forest');
  assert.equal(findName({ category: 'forest', nickname: 'Fort woods', habitat: { name: 'Softwood forest' } }), 'Fort woods');
  assert.equal(findName({ category: 'plant', nickname: '  ', species: { name: ' ' } }), 'Plant');
});

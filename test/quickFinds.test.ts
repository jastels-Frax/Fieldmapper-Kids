import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quickKinds, DEFAULT_QUICK, quickFor, pickedKinds, toggleQuickKind, MAX_QUICK, QUICK_CHOICES, quickChoiceOf, quickFace } from '../src/quickFinds.ts';
import { CATEGORIES, GROUPS } from '../src/categories.ts';
import type { CategoryId } from '../src/types.ts';

const finds = (...c: CategoryId[]) => c.map(category => ({ category }));

test('the choices are the top of "What is it?": the groups and Other', () => {
  assert.deepEqual(QUICK_CHOICES, [...GROUPS.map(g => g.generic), 'other']);
  assert.equal(quickChoiceOf('bird'), 'animal');
  assert.equal(quickChoiceOf('shelf'), 'mushroom');
  assert.equal(quickChoiceOf('water'), 'habitat');
  assert.equal(quickChoiceOf('other'), 'other');
  assert.equal(quickFace('plant').label, 'Plant');
  assert.equal(quickFace('lichen').art, 'lichen');
  assert.equal(quickFace('other').label, 'Other');
});

test('no finds yet: the defaults', () => {
  assert.deepEqual(quickKinds([]), DEFAULT_QUICK);
  for (const c of DEFAULT_QUICK) assert.ok(QUICK_CHOICES.includes(c));
});

test('most found GROUP first, ties to the most recent, topped up from the defaults', () => {
  assert.deepEqual(quickKinds(finds('tree', 'rock', 'fern', 'rock', 'shelf')), ['plant', 'habitat', 'mushroom']);
  assert.deepEqual(quickKinds(finds('rock')), ['habitat', 'animal', 'plant']);
  assert.deepEqual(quickKinds(finds('bird', 'mammal')), ['animal', 'plant', 'mushroom']);
});

test('an old mystery find is not a choice any more, nor a stored pick of one', () => {
  assert.deepEqual(quickKinds(finds('mystery', 'mystery', 'tree')), ['plant', 'animal', 'mushroom']);
  assert.deepEqual(pickedKinds(['mystery', 'bird']), ['animal']);
});

test('quick finds are off until an explorer turns them on', () => {
  assert.deepEqual(quickFor(undefined, finds('bird')), []);
  assert.deepEqual(quickFor({ on: false, kinds: ['rock'] }, finds('bird')), []);
});

test('on: the choices picked, else the groups found most', () => {
  assert.deepEqual(quickFor({ on: true }, finds('tree', 'tree')), ['plant', 'animal', 'mushroom']);
  assert.deepEqual(quickFor({ on: true, kinds: [] }, finds('tree')), ['plant', 'animal', 'mushroom']);
  assert.deepEqual(quickFor({ on: true, kinds: ['sign', 'rock'] }, finds('tree')), ['animal', 'habitat']);
});

test('a stored pick of kinds (from before the buttons were groups) folds to groups, once each, at most three', () => {
  assert.deepEqual(pickedKinds(['bird', 'bug', 'bushy']), ['animal', 'lichen']);
  assert.deepEqual(pickedKinds(['rock', 'nope', 'rock', 'bird', 'tree', 'shelf']), ['habitat', 'animal', 'plant']);
  assert.equal(MAX_QUICK, 3);
});

test('tapping a choice adds it while there is room and takes it off when picked', () => {
  assert.deepEqual(toggleQuickKind(undefined, 'animal'), ['animal']);
  assert.deepEqual(toggleQuickKind(['animal', 'plant'], 'animal'), ['plant']);
  assert.deepEqual(toggleQuickKind(['animal', 'plant', 'habitat'], 'other'), ['animal', 'plant', 'habitat']);
});

test('every quick-find word is short enough for a chip', () => {
  for (const id of QUICK_CHOICES) assert.ok(quickFace(id).label.length <= 8, `${id}: give it a short word`);
  for (const c of CATEGORIES) assert.ok((c.short ?? c.label).length <= 8, `${c.id}: give it a short word`);
});

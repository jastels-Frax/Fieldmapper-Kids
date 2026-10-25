import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quickKinds, DEFAULT_QUICK, quickFor, pickedKinds, toggleQuickKind, MAX_QUICK } from '../src/quickFinds.ts';
import { CATEGORIES } from '../src/categories.ts';
import type { CategoryId } from '../src/types.ts';

const finds = (...c: CategoryId[]) => c.map(category => ({ category }));

test('no finds yet: the defaults', () => {
  assert.deepEqual(quickKinds([]), DEFAULT_QUICK);
});

test('most found first, ties to the most recent, topped up from the defaults', () => {
  assert.deepEqual(quickKinds(finds('tree', 'rock', 'tree', 'rock', 'mushroom')), ['tree', 'rock', 'mushroom']);
  assert.deepEqual(quickKinds(finds('rock')), ['rock', 'bird', 'flower']);
  assert.deepEqual(quickKinds(finds('bird', 'bird')), ['bird', 'flower', 'bug']);
});

test('a mystery is not a kind worth a button', () => {
  assert.deepEqual(quickKinds(finds('mystery', 'mystery', 'tree')), ['tree', 'bird', 'flower']);
});

test('quick finds are off until an explorer turns them on', () => {
  assert.deepEqual(quickFor(undefined, finds('bird')), []);
  assert.deepEqual(quickFor({ on: false, kinds: ['rock'] }, finds('bird')), []);
});

test('on: the kinds picked, else the kinds found most', () => {
  assert.deepEqual(quickFor({ on: true }, finds('tree', 'tree')), ['tree', 'bird', 'flower']);
  assert.deepEqual(quickFor({ on: true, kinds: [] }, finds('tree')), ['tree', 'bird', 'flower']);
  assert.deepEqual(quickFor({ on: true, kinds: ['sign', 'rock'] }, finds('tree')), ['sign', 'rock']);
});

test('a stored pick keeps only real kinds, once each, at most three', () => {
  assert.deepEqual(pickedKinds(['rock', 'nope', 'rock', 'bird', 'bug', 'sky']), ['rock', 'bird', 'bug']);
  assert.equal(MAX_QUICK, 3);
});

test('tapping a kind adds it while there is room and takes it off when picked', () => {
  assert.deepEqual(toggleQuickKind(undefined, 'bird'), ['bird']);
  assert.deepEqual(toggleQuickKind(['bird', 'bug'], 'bird'), ['bug']);
  assert.deepEqual(toggleQuickKind(['bird', 'bug', 'rock'], 'sky'), ['bird', 'bug', 'rock']);
});

test('every quick-find word is short enough for a chip', () => {
  for (const c of CATEGORIES) assert.ok((c.short ?? c.label).length <= 8, `${c.id}: give it a short word`);
});

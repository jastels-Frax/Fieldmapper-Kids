import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quickKinds, DEFAULT_QUICK } from '../src/quickFinds.ts';
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

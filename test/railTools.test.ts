import { test } from 'node:test';
import assert from 'node:assert/strict';
import { railFor, moveTool, toggleTool, TIER_TOOLS, TOOLS } from '../src/railTools.ts';

test('no choice: the tier default, and every default is a real tool', () => {
  assert.deepEqual(railFor(undefined, 'sprout'), TIER_TOOLS.sprout);
  for (const list of Object.values(TIER_TOOLS)) for (const id of list) assert.ok(TOOLS.some(t => t.id === id), id);
  assert.ok(TIER_TOOLS.sprout.length < TIER_TOOLS.naturalist.length, 'little ones get fewer buttons');
});

test('a choice is honoured, cleaned of unknown and repeated ids, even when empty', () => {
  assert.deepEqual(railFor(['hunts', 'me', 'gone', 'me'], 'explorer'), ['hunts', 'me']);
  assert.deepEqual(railFor([], 'explorer'), []);
});

test('move and toggle', () => {
  assert.deepEqual(moveTool(['me', 'map', 'done'], 'done', -1), ['me', 'done', 'map']);
  assert.deepEqual(moveTool(['me', 'map'], 'me', -1), ['me', 'map']);
  assert.deepEqual(toggleTool(['me'], 'draw'), ['me', 'draw']);
  assert.deepEqual(toggleTool(['me', 'draw'], 'me'), ['draw']);
});

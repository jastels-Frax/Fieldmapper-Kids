import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, ITEM_LIBRARY, meetsRule, autoMatches, huntProgress, tick, makeCustomHunt, openItems, type HuntRun } from '../src/hunts.ts';
import type { BadgeFind } from '../src/badges.ts';

const find = (over: Partial<BadgeFind>): BadgeFind => ({ createdAt: '', category: 'mystery', colours: [], ...over });
const run = (huntId = 'rainbow'): HuntRun => ({ id: 'r1', hunt: HUNTS.find(h => h.id === huntId)!, startedAt: '', found: {}, status: 'active' });

test('library ids are unique and every hunt has items', () => {
  assert.equal(new Set(ITEM_LIBRARY.map(i => i.id)).size, ITEM_LIBRARY.length);
  assert.equal(new Set(HUNTS.map(h => h.id)).size, HUNTS.length);
  for (const h of HUNTS) {
    assert.ok(h.items.length >= 5, h.id);
    assert.equal(new Set(h.items.map(i => i.id)).size, h.items.length, h.id);
  }
});

test('rules need every condition', () => {
  const yellowFlower = ITEM_LIBRARY.find(i => i.id === 'yellow-flower')!;
  assert.equal(meetsRule(yellowFlower, find({ category: 'flower', colours: ['yellow'] })), true);
  assert.equal(meetsRule(yellowFlower, find({ category: 'flower', colours: ['red'] })), false);
  assert.equal(meetsRule(yellowFlower, find({ category: 'bug', colours: ['yellow'] })), false);
});

test('a free item is never auto-ticked', () => {
  const feather = ITEM_LIBRARY.find(i => i.id === 'feather')!;
  assert.equal(meetsRule(feather, find({ category: 'bird', colours: ['white'] })), false);
});

test('one find can tick several items, and only open ones', () => {
  const r = run();
  const f = find({ colours: ['red', 'blue'] });
  assert.deepEqual(autoMatches(r, f, new Set()).sort(), ['blue', 'red']);
  const r2 = tick(r, ['red'], 'f1', new Set(), 't');
  assert.deepEqual(autoMatches(r2, f, new Set(['f1'])), ['blue']);
});

test('completing every item finishes the hunt', () => {
  let r = run();
  const ids = r.hunt.items.map(i => i.id);
  const live = new Set<string>();
  ids.forEach((id, n) => { r = tick(r, [id], `f${n}`, live, 'now'); live.add(`f${n}`); });
  assert.equal(r.status, 'done');
  assert.equal(r.finishedAt, 'now');
  assert.deepEqual(huntProgress(r, live), { done: ids.length, total: ids.length, complete: true });
});

test('deleting a find re-opens its item', () => {
  const r = tick(run(), ['red'], 'f1', new Set(), 't');
  assert.equal(huntProgress(r, new Set(['f1'])).done, 1);
  assert.equal(huntProgress(r, new Set()).done, 0);
  assert.ok(openItems(r, new Set()).some(i => i.id === 'red'));
});

test('custom hunts are refused when empty and capped', () => {
  assert.equal(makeCustomHunt('c', '  ', '', ITEM_LIBRARY.slice(0, 2)), null);
  assert.equal(makeCustomHunt('c', 'Mine', '', []), null);
  const h = makeCustomHunt('c', 'Mine', '', [...ITEM_LIBRARY, ...ITEM_LIBRARY])!;
  assert.equal(h.items.length, 12);
  assert.equal(new Set(h.items.map(i => i.id)).size, 12);
  assert.equal(h.emoji, '🗺️');
  assert.equal(h.custom, true);
});

test('an item for an older kind is ticked by the kinds that refine it', () => {
  const animal = ITEM_LIBRARY.find(i => i.id === 'animal')!;
  const mushroom = ITEM_LIBRARY.find(i => i.id === 'mushroom')!;
  const plant = ITEM_LIBRARY.find(i => i.id === 'plant')!;
  const lichen = ITEM_LIBRARY.find(i => i.id === 'lichen')!;
  assert.equal(meetsRule(animal, find({ category: 'mammal' })), true);
  assert.equal(meetsRule(mushroom, find({ category: 'shelf' })), true);
  assert.equal(meetsRule(plant, find({ category: 'moss' })), true);
  assert.equal(meetsRule(lichen, find({ category: 'bushy' })), true);
  assert.equal(meetsRule(animal, find({ category: 'bird' })), false);
});

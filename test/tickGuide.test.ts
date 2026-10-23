import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TICK_SPOTS, PET_SPOT, TICK_GUIDE, allClear, recordCheck } from '../src/tickGuide.ts';

test('spot ids are unique and the pet is separate', () => {
  const ids = TICK_SPOTS.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(!ids.includes(PET_SPOT.id));
});

test('all clear needs every spot but not the pet', () => {
  assert.equal(allClear(new Set()), false);
  const all = new Set(TICK_SPOTS.map(s => s.id));
  assert.equal(allClear(all), true);
  all.delete('toes');
  all.add('pet');
  assert.equal(allClear(all), false);
});

test('the guide covers removal and when to get help', () => {
  const text = TICK_GUIDE.flatMap(s => s.points).join(' ');
  assert.match(text, /tweezers/);
  assert.match(text, /steady, even pressure/);
  assert.match(text, /Do not twist/);
  assert.match(text, /rash/);
});

test('the check history is bounded', () => {
  assert.deepEqual(recordCheck(undefined, 'a'), ['a']);
  const h = recordCheck(Array.from({ length: 100 }, (_, i) => String(i)), 'new');
  assert.equal(h.length, 100);
  assert.equal(h[99], 'new');
  assert.equal(h[0], '1');
});

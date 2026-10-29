import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bookFinds, mapFinds, normalizeFind, observerOf, photoCount, drawingCount } from '../src/findModel.ts';
import type { Find } from '../src/types.ts';

test('a find with no lists gets empty ones', () => {
  const f = normalizeFind({ id: 'f', createdAt: '', category: 'rock' } as unknown as Find);
  assert.deepEqual(f.pictures, []);
  assert.deepEqual(f.colours, []);
});

test('a picture is reduced to which picture it is', () => {
  const raw = { id: 'f', createdAt: '', category: 'rock', colours: [], pictures: [{ id: 'x', kind: 'drawing', blob: 'bytes' }] } as unknown as Find;
  const f = normalizeFind(raw);
  assert.deepEqual(f.pictures, [{ id: 'x', kind: 'drawing' }]);
  assert.equal(drawingCount(f), 1);
  assert.equal(photoCount(f), 0);
});

test('the map shows my finds, and everyone\'s on this device only when asked', () => {
  const all = [{ id: 'a', profileId: 'me' }, { id: 'b', profileId: 'sis' }, { id: 'c' }, { id: 'd', profileId: 'bro' }];
  const just = mapFinds(all, 'me', false);
  assert.deepEqual(just.mine.map(f => f.id), ['a', 'c'], 'a find from before profiles counts as mine, as everywhere');
  assert.deepEqual(just.others, []);
  const every = mapFinds(all, 'me', true);
  assert.deepEqual(every.mine.map(f => f.id), ['a', 'c']);
  assert.deepEqual(every.others.map(f => f.id), ['b', 'd']);
});

test('the book shows one observer\'s finds, or everyone\'s', () => {
  const all = [{ id: 'a', profileId: 'me' }, { id: 'b', profileId: 'sis' }, { id: 'c' }, { id: 'd', profileId: 'bro' }];
  assert.equal(observerOf({}, 'me'), 'me', 'a find from before profiles is whoever is exploring');
  assert.equal(observerOf({ profileId: 'sis' }, 'me'), 'sis');
  assert.deepEqual(bookFinds(all, 'me', 'me').map(f => f.id), ['a', 'c']);
  assert.deepEqual(bookFinds(all, 'me', 'sis').map(f => f.id), ['b']);
  assert.deepEqual(bookFinds(all, 'me', 'all').map(f => f.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(bookFinds(all, 'me', 'nobody'), []);
});

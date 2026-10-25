import { test } from 'node:test';
import assert from 'node:assert/strict';
import { holdsMedia, splitStoredFind } from '../src/findSplit.ts';

const ids = () => { let n = 0; return () => `p${++n}`; };

test('a version-1 find splits into a picture list, photo first', () => {
  const raw = { id: 'f', category: 'bird', photo: 'A', drawing: 'B', voice: 'V' };
  assert.equal(holdsMedia(raw), true);
  const { light, media } = splitStoredFind(raw, ids());
  assert.deepEqual(light.pictures, [{ id: 'p1', kind: 'photo' }, { id: 'p2', kind: 'drawing' }]);
  assert.equal(light.hasVoice, true);
  assert.equal(light.voiceCount, 1);
  for (const k of ['photo', 'drawing', 'voice']) assert.equal(k in light, false);
  assert.deepEqual(media, { id: 'f', pictures: [{ id: 'p1', kind: 'photo', blob: 'A' }, { id: 'p2', kind: 'drawing', blob: 'B' }], voices: ['V'] });
  assert.equal(holdsMedia(light), false);
});

test('a find with inline pictures keeps their ids and order', () => {
  const raw = { id: 'f', thumb: 'T', pictures: [{ id: 'a', kind: 'drawing', blob: 1 }, { id: 'b', kind: 'photo', blob: 2 }] };
  const { light, media } = splitStoredFind(raw, ids());
  assert.deepEqual(light.pictures, [{ id: 'a', kind: 'drawing' }, { id: 'b', kind: 'photo' }]);
  assert.equal(light.thumb, 'T');
  assert.equal('hasVoice' in light, false);
  assert.deepEqual(media.pictures.map(p => p.blob), [1, 2]);
});

test('a light record holds no media', () => {
  assert.equal(holdsMedia({ id: 'f', pictures: [{ id: 'a', kind: 'photo' }], hasVoice: true }), false);
  assert.equal(holdsMedia({ id: 'f' }), false);
});

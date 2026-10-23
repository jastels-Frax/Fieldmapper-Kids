import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFind, photoCount, drawingCount } from '../src/findModel.ts';
import type { Find } from '../src/types.ts';

const ids = () => { let n = 0; return () => `p${++n}`; };
const blob = (t: string) => new Blob([t], { type: 'image/jpeg' });

test('a version-1 find becomes a picture list, photo first', () => {
  const old = { id: 'f', createdAt: '', category: 'bird', colours: ['red'], photo: blob('a'), drawing: blob('b') } as unknown as Find;
  const f = normalizeFind(old, ids());
  assert.equal(f.pictures.length, 2);
  assert.deepEqual(f.pictures.map(p => p.kind), ['photo', 'drawing']);
  assert.equal('photo' in f, false);
  assert.equal('drawing' in f, false);
  assert.equal(photoCount(f), 1);
  assert.equal(drawingCount(f), 1);
});

test('a find with no pictures gets an empty list, and a current one is unchanged', () => {
  assert.deepEqual(normalizeFind({ id: 'f', createdAt: '', category: 'rock' } as unknown as Find, ids()).pictures, []);
  const pics = [{ id: 'x', kind: 'drawing' as const, blob: blob('c') }];
  const f = normalizeFind({ id: 'f', createdAt: '', category: 'rock', colours: [], pictures: pics }, ids());
  assert.equal(f.pictures, pics);
});

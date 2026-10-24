import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFind, photoCount, drawingCount } from '../src/findModel.ts';
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

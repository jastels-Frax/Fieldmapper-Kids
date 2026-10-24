import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromBytes, isStoredBytes, revive, toBytes } from '../src/storedBytes.ts';

test('a picture round-trips through its stored bytes', async () => {
  const b = new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'image/jpeg' });
  const s = await toBytes(b);
  assert.ok(isStoredBytes(s));
  const back = fromBytes(s);
  assert.equal(back.type, 'image/jpeg');
  assert.deepEqual([...new Uint8Array(await back.arrayBuffer())], [1, 2, 3, 250]);
  // Structured clone, as IndexedDB stores it, keeps the shape.
  assert.ok(isStoredBytes(structuredClone(s)));
});

test('revive: bytes come back as they are, an old Blob is read into memory and flagged for rewriting', async () => {
  const r1 = await revive(await toBytes(new Blob(['ab'], { type: 'text/plain' })));
  assert.equal(await r1.blob!.text(), 'ab');
  assert.equal(r1.legacy, false);
  const r2 = await revive(new Blob(['cd'], { type: 'image/png' }));
  assert.equal(await r2.blob!.text(), 'cd');
  assert.equal(r2.legacy, true);
  assert.equal(r2.lost, false);
  assert.deepEqual(await revive(undefined), { legacy: false, lost: false });
});

test('an old Blob Safari can no longer read is kept and flagged lost, never rewritten', async () => {
  class Dangling extends Blob { override arrayBuffer(): Promise<ArrayBuffer> { return Promise.reject(new Error('WebKitBlobResource error 1')); } }
  const d = new Dangling(['x']);
  const r = await revive(d);
  assert.equal(r.lost, true);
  assert.equal(r.blob, d);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { connectionLost, outOfSpace, withRetry } from '../src/dbRetry.ts';

const err = (name: string) => Object.assign(new Error(name), { name });
const noWait = async () => {};

test('a lost connection is worth a fresh one; a real failure is the answer', () => {
  for (const n of ['UnknownError', 'InvalidStateError', 'AbortError']) assert.ok(connectionLost(err(n)), n);
  for (const n of ['QuotaExceededError', 'DataCloneError', 'ConstraintError', 'VersionError', 'TypeError']) assert.ok(!connectionLost(err(n)), n);
  assert.ok(!connectionLost(null) && !connectionLost(undefined) && !connectionLost('UnknownError'));
  assert.ok(outOfSpace(err('QuotaExceededError')));
  assert.ok(!outOfSpace(err('UnknownError')));
});

test('a request on a lost connection runs again on a new one, and the dead one is forgotten', async () => {
  let opened = 0;
  const forgotten: number[] = [];
  const conns: Promise<number>[] = [];
  const open = () => { const c = Promise.resolve(++opened); conns.push(c); return c; };
  let calls = 0;
  const out = await withRetry(open, used => forgotten.push(conns.indexOf(used) + 1), async d => {
    calls++;
    if (d === 1) throw err('UnknownError');
    return `saved on ${d}`;
  }, [5, 5], noWait);
  assert.equal(out, 'saved on 2');
  assert.equal(calls, 2);
  assert.deepEqual(forgotten, [1]);
});

test('an open that fails is tried again too', async () => {
  let n = 0;
  const out = await withRetry(() => (++n === 1 ? Promise.reject(err('UnknownError')) : Promise.resolve(n)), () => {}, async d => d, [5], noWait);
  assert.equal(out, 2);
});

test('no space is not retried, and the reason comes back as it is', async () => {
  let calls = 0;
  await assert.rejects(withRetry(() => Promise.resolve(1), () => {}, async () => { calls++; throw err('QuotaExceededError'); }, [5, 5], noWait),
    (e: Error) => e.name === 'QuotaExceededError');
  assert.equal(calls, 1);
});

test('it gives up after the last wait, with the last error', async () => {
  let calls = 0;
  const waits: number[] = [];
  await assert.rejects(withRetry(() => Promise.resolve(1), () => {}, async () => { calls++; throw err('UnknownError'); }, [250, 1000], async ms => { waits.push(ms); }),
    (e: Error) => e.name === 'UnknownError');
  assert.equal(calls, 3);
  assert.deepEqual(waits, [250, 1000]);
});

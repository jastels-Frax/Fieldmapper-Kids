import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeGateQuestion, checkGateAnswer } from '../src/gate.ts';

test('the answer matches the question', () => {
  for (let i = 0; i < 50; i++) {
    const q = makeGateQuestion();
    const [a, b] = q.text.split(' = ')[0].split(' × ').map(Number);
    assert.equal(a * b, q.answer);
    assert.ok(q.answer >= 72);
  }
});

test('checking is strict', () => {
  const q = { text: '12 × 6 = ?', answer: 72 };
  assert.equal(checkGateAnswer(q, '72'), true);
  assert.equal(checkGateAnswer(q, ' 72 '), true);
  assert.equal(checkGateAnswer(q, ''), false);
  assert.equal(checkGateAnswer(q, '72.0'), true);
  assert.equal(checkGateAnswer(q, '71'), false);
  assert.equal(checkGateAnswer(q, 'abc'), false);
});

import { afterMiss, pausedFor, readLock, GATE_PAUSE_MS, OPEN_LOCK } from '../src/gate.ts';

test('three wrong answers in a row pause the gate for a minute, then it opens again', () => {
  let lock = OPEN_LOCK;
  lock = afterMiss(lock, 1000);
  lock = afterMiss(lock, 2000);
  assert.equal(pausedFor(lock, 2000), 0);
  lock = afterMiss(lock, 3000);
  assert.equal(pausedFor(lock, 3000), GATE_PAUSE_MS);
  assert.equal(pausedFor(lock, 3000 + GATE_PAUSE_MS), 0);
  assert.equal(lock.misses, 0);
});

test('a stored lock is read safely', () => {
  const now = 1_000_000;
  assert.deepEqual(readLock(null, now), OPEN_LOCK);
  assert.deepEqual(readLock('nonsense', now), OPEN_LOCK);
  assert.deepEqual(readLock(JSON.stringify({ misses: 2, until: now + 5000 }), now), { misses: 2, until: now + 5000 });
  // Far in the future (a clock change): ignored rather than a gate that never opens.
  assert.equal(readLock(JSON.stringify({ misses: 1, until: now + 10 * GATE_PAUSE_MS }), now).until, 0);
});

test('every miss can be asked a fresh question', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 20; i++) seen.add(makeGateQuestion().text);
  assert.ok(seen.size > 5);
});

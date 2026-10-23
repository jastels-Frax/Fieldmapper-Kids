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

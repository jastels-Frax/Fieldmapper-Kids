import { test } from 'node:test';
import assert from 'node:assert/strict';
import { challengesFor, completedChallenges, CHALLENGES_PER_DAY } from '../src/challenges.ts';

test('a day always gives the same challenges', () => {
  assert.deepEqual(challengesFor('2026-10-23').map(c => c.id), challengesFor('2026-10-23').map(c => c.id));
});

test('challenges are distinct and the right number', () => {
  for (let d = 1; d <= 28; d++) {
    const ids = challengesFor(`2026-02-${String(d).padStart(2, '0')}`).map(c => c.id);
    assert.equal(ids.length, CHALLENGES_PER_DAY);
    assert.equal(new Set(ids).size, ids.length);
  }
});

test('different days vary', () => {
  const sets = new Set(Array.from({ length: 30 }, (_, i) => challengesFor(`2026-03-${String(i + 1).padStart(2, '0')}`).map(c => c.id).join()));
  assert.ok(sets.size > 20);
});

test('a matching find completes a challenge', () => {
  const ch = challengesFor('2026-10-23');
  const done = completedChallenges(ch, [{ createdAt: '', category: 'bird', colours: ['red', 'yellow', 'blue', 'purple', 'brown', 'white'], size: 'tiny', count: 'lots', hasDrawing: true, hasVoice: true }]);
  for (const c of ch) {
    const expect = c.test({ createdAt: '', category: 'bird', colours: ['red', 'yellow', 'blue', 'purple', 'brown', 'white'], size: 'tiny', count: 'lots', hasDrawing: true, hasVoice: true });
    assert.equal(done.has(c.id), expect);
  }
  assert.equal(completedChallenges(ch, []).size, 0);
});

test('a challenge for an older kind is met by the kinds that refine it', () => {
  // Any day whose challenges include "Find an animal" or "Find a mushroom".
  for (let d = 1; d <= 28; d++) {
    for (const c of challengesFor(`2026-02-${String(d).padStart(2, '0')}`)) {
      if (c.id === 'animal') assert.equal(c.test({ createdAt: '', category: 'reptile', colours: [] }), true);
      if (c.id === 'mushroom') assert.equal(c.test({ createdAt: '', category: 'puffball', colours: [] }), true);
      if (c.id === 'lichen') assert.equal(c.test({ createdAt: '', category: 'leafy', colours: [] }), true);
    }
  }
});

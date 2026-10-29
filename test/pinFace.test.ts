import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pinLayout, pinParts } from '../src/pinFace.ts';

const all = pinParts(undefined);

test('absent means every part on, as pins were before the choice', () => {
  assert.deepEqual(all, { picture: true, kind: true, finder: true });
  assert.deepEqual(pinParts({ kind: false, finder: 'x' }), { picture: true, kind: false, finder: true });
});

test('the pin holds the first part it has; the rest are badges, each part once', () => {
  assert.deepEqual(pinLayout(all, { picture: true, finder: true }), { face: 'picture', badges: ['kind', 'finder'] });
  assert.deepEqual(pinLayout(all, { picture: false, finder: true }), { face: 'kind', badges: ['finder'] });
  assert.deepEqual(pinLayout(all, { picture: true, finder: false }), { face: 'picture', badges: ['kind'] });
  assert.deepEqual(pinLayout(all, { picture: false, finder: false }), { face: 'kind', badges: [] });
});

test('switching parts off takes them off the pin', () => {
  const pictureOnly = { picture: true, kind: false, finder: false };
  assert.deepEqual(pinLayout(pictureOnly, { picture: true, finder: true }), { face: 'picture', badges: [] });
  // A find with no picture, and only the picture asked for: a plain pin in its kind's colour.
  assert.deepEqual(pinLayout(pictureOnly, { picture: false, finder: true }), { face: null, badges: [] });
  const finderOnly = { picture: false, kind: false, finder: true };
  assert.deepEqual(pinLayout(finderOnly, { picture: true, finder: true }), { face: 'finder', badges: [] });
  const kindAndFinder = { picture: false, kind: true, finder: true };
  assert.deepEqual(pinLayout(kindAndFinder, { picture: true, finder: true }), { face: 'kind', badges: ['finder'] });
});

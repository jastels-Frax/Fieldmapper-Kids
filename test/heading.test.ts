import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compassWord, headingFrom, norm, smoothHeading } from '../src/heading.ts';

test('iOS reads webkitCompassHeading as it is; Android turns an absolute alpha the right way round', () => {
  assert.equal(headingFrom({ webkitCompassHeading: 90, absolute: true, alpha: 10 }), 90);
  assert.equal(headingFrom({ absolute: true, alpha: 90 }), 270);
  assert.equal(headingFrom({ absolute: true, alpha: 0 }), 0);
  assert.equal(headingFrom({ absolute: false, alpha: 90 }), null, 'a relative alpha says nothing about north');
  assert.equal(headingFrom({}), null);
  assert.equal(headingFrom({ webkitCompassHeading: null, absolute: true, alpha: null }), null);
});

test('smoothing turns the short way across north and never jumps by 360', () => {
  assert.equal(smoothHeading(null, 200), 200);
  const a = smoothHeading(350, 10, 0.5);
  assert.equal(a, 360);
  assert.equal(norm(smoothHeading(10, 350, 0.5)), 0);
  let d: number | null = null;
  for (let i = 0; i < 60; i++) d = smoothHeading(d, 90);
  assert.ok(Math.abs((d as number) - 90) < 1e-6);
});

test('compass words', () => {
  assert.equal(compassWord(0), 'north');
  assert.equal(compassWord(359), 'north');
  assert.equal(compassWord(92), 'east');
  assert.equal(compassWord(225), 'south-west');
  assert.equal(compassWord(-90), 'west');
});

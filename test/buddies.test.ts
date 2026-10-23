import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buddySvg, EXPRESSIONS, BUDDY_NAMES } from '../src/buddies.ts';
import { greet, tip, stepLine, cheer, STEP_LINES } from '../src/buddyLines.ts';

test('every pose draws for both buddies', () => {
  for (const b of ['rat', 'frog'] as const) {
    for (const e of EXPRESSIONS) {
      const svg = buddySvg(b, e);
      assert.match(svg, /^<svg[^>]*viewBox="0 0 256 256"/);
      assert.ok(svg.endsWith('</svg>'));
    }
  }
});

test('each drawing gets its own rim filter id', () => {
  const a = buddySvg('rat').match(/filter id="([^"]+)"/)![1];
  const b = buddySvg('rat').match(/filter id="([^"]+)"/)![1];
  assert.notEqual(a, b);
});

test('names match the Field Mapper tour', () => {
  assert.deepEqual(BUDDY_NAMES, { rat: 'Pip', frog: 'Hop' });
});

test('every line exists for both buddies', () => {
  for (const b of ['rat', 'frog'] as const) {
    for (let i = 0; i < 20; i++) {
      const r = () => i / 20;
      assert.ok(greet(b, r).text && tip(b, r).text && cheer(b, r).text);
    }
    for (const s of Object.keys(STEP_LINES)) assert.ok(stepLine(b, s).text);
  }
  assert.ok(greet('rat', () => 0.999).text);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_LOOK, normalizeLook, THEMES, BUTTON_STYLES, TEXT_SIZES, FONTS, MOTIONS, lookAttributes } from '../src/look.ts';

test('absence and unknown ids fall back to the default', () => {
  assert.deepEqual(normalizeLook(undefined), DEFAULT_LOOK);
  assert.deepEqual(normalizeLook({ theme: 'lava', buttons: 'flat' }), { ...DEFAULT_LOOK, buttons: 'flat' });
});

test('every choice id is unique', () => {
  for (const list of [THEMES, BUTTON_STYLES, TEXT_SIZES, FONTS, MOTIONS]) {
    assert.equal(new Set(list.map(c => c.id)).size, list.length);
  }
});

test('every non-default choice has CSS, and the default needs none', () => {
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const blocks: [string, { id: string }[], string][] = [
    ['theme', THEMES, DEFAULT_LOOK.theme], ['buttons', BUTTON_STYLES, DEFAULT_LOOK.buttons],
    ['text', TEXT_SIZES, DEFAULT_LOOK.text], ['font', FONTS, DEFAULT_LOOK.font], ['motion', MOTIONS, DEFAULT_LOOK.motion],
  ];
  for (const [attr, list, def] of blocks) {
    for (const c of list) {
      if (c.id === def) continue;
      assert.ok(css.includes(`html[data-${attr}="${c.id}"]`), `no CSS for data-${attr}="${c.id}"`);
    }
  }
  assert.deepEqual(Object.keys(lookAttributes(DEFAULT_LOOK)).sort(), ['buttons', 'font', 'motion', 'text', 'theme']);
});

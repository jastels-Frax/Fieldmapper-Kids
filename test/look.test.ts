import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_LOOK, normalizeLook, LOOK_KEYS, choicesFor, lookAttributes, surpriseLook, FONT_STACKS, FONTS, PARTIES, type Look } from '../src/look.ts';

test('absence and unknown ids fall back to the default', () => {
  assert.deepEqual(normalizeLook(undefined), DEFAULT_LOOK);
  assert.deepEqual(normalizeLook({ theme: 'lava', buttons: 'flat' }), { ...DEFAULT_LOOK, buttons: 'flat' });
});

test('every choice id is unique', () => {
  for (const k of LOOK_KEYS) {
    const list = choicesFor(k);
    assert.equal(new Set(list.map(c => c.id)).size, list.length, k);
    assert.ok(list.some(c => c.id === DEFAULT_LOOK[k]), `default ${k} is a choice`);
  }
});

test('a withdrawn button style folds onto its successor', () => {
  assert.equal(normalizeLook({ buttons: 'blocky' }).buttons, 'pixel');
});

test('every non-default choice has CSS, and the default needs none', () => {
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const attrs = lookAttributes(DEFAULT_LOOK);
  assert.deepEqual(Object.keys(attrs).sort(), LOOK_KEYS.filter(k => k !== 'party').slice().sort());
  for (const k of Object.keys(attrs) as (keyof Look)[]) {
    for (const c of choicesFor(k)) {
      if (c.id === DEFAULT_LOOK[k]) continue;
      assert.ok(css.includes(`html[data-${k}="${c.id}"]`), `no CSS for data-${k}="${c.id}"`);
    }
  }
  // The picker's samples show each choice whatever the current look is.
  for (const c of choicesFor('buttons')) if (c.id !== 'bubbly') assert.ok(css.includes(`.bs-btn[data-bs="${c.id}"]`), c.id);
  for (const c of choicesFor('pattern')) assert.ok(css.includes(`[data-pat="${c.id}"]`), c.id);
  for (const c of choicesFor('header')) assert.ok(css.includes(`[data-hd="${c.id}"]`), c.id);
});

test('the font stacks restated for the picker match the CSS', () => {
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  for (const f of FONTS) {
    if (f.id === 'rounded') assert.ok(css.includes(`--font: ${FONT_STACKS.rounded};`));
    else assert.ok(css.includes(`html[data-font="${f.id}"] { --font: ${FONT_STACKS[f.id]};`), f.id);
  }
});

test('celebrations: emoji styles carry their pieces', () => {
  for (const p of PARTIES) if (p.id === 'stars' || p.id === 'leaves') assert.ok(p.pieces.length > 0);
});

test('surprise me changes the fun switches and keeps the needs', () => {
  const cur: Look = { ...DEFAULT_LOOK, text: 'bigger', motion: 'calm' };
  let seed = 0.123;
  const rand = () => (seed = (seed * 9301 + 0.49297) % 1);
  for (let i = 0; i < 20; i++) {
    const s = surpriseLook(cur, rand);
    assert.equal(s.text, 'bigger');
    assert.equal(s.motion, 'calm');
    for (const k of ['theme', 'buttons', 'pattern', 'header', 'pins', 'party', 'font'] as const) assert.notEqual(s[k], cur[k], k);
    assert.deepEqual(normalizeLook(s), s);
  }
});

import { withTheme } from '../src/look.ts';

test('the Field Journal draws its own buttons and title strip, and gives the picks back after', () => {
  const picked = { ...DEFAULT_LOOK, buttons: 'sticker', header: 'rainbow', pattern: 'dots' } as Look;
  const j = lookAttributes({ ...picked, theme: 'journal' });
  assert.equal(j.buttons, DEFAULT_LOOK.buttons);
  assert.equal(j.header, DEFAULT_LOOK.header);
  assert.equal(j.pattern, 'dots', 'only what the journal draws itself rests');
  const o = lookAttributes({ ...picked, theme: 'ocean' });
  assert.equal(o.buttons, 'sticker');
  assert.equal(o.header, 'rainbow');
});
import { existsSync } from 'node:fs';

test('the Field Journal brings storybook letters, but never over letters an explorer chose', () => {
  assert.equal(withTheme(DEFAULT_LOOK, 'journal').font, 'storybook');
  assert.equal(withTheme({ ...DEFAULT_LOOK, font: 'easy' }, 'journal').font, 'easy');
  assert.equal(withTheme(DEFAULT_LOOK, 'ocean').font, DEFAULT_LOOK.font);
  assert.equal(withTheme(withTheme(DEFAULT_LOOK, 'journal'), 'forest').font, DEFAULT_LOOK.font, 'leaving takes the letters back');
  assert.equal(withTheme({ ...DEFAULT_LOOK, theme: 'journal', font: 'chunky' }, 'forest').font, 'chunky');
});

test('every Field Journal plate the stylesheet names is in the repo', () => {
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const urls = [...css.matchAll(/url\("\.\/(assets\/journal\/[^"]+)"\)/g)].map(m => m[1]);
  assert.ok(urls.length >= 10);
  for (const u of urls) assert.ok(existsSync(new URL(`../src/${u}`, import.meta.url)), u);
});

import { TIERS, tierOf, MODE_WORDS } from '../src/tiers.ts';

test('tiers: absence reads as Explorer, and every default look is valid', () => {
  assert.equal(tierOf(undefined).id, 'explorer');
  assert.equal(tierOf('dragon').id, 'explorer');
  assert.deepEqual(TIERS.map(t => t.id), ['sprout', 'explorer', 'naturalist']);
  for (const t of TIERS) assert.deepEqual(normalizeLook(t.defaultLook), { ...DEFAULT_LOOK, ...t.defaultLook });
  assert.equal(TIERS[0].defaultMode, 'together');
  assert.notEqual(MODE_WORDS.explorer.title, 'Explorer');
});

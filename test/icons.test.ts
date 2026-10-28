import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ICON_IDS, iconSvg } from '../src/icons.ts';

test('every icon is our own inked line in the text colour, hidden from screen readers', () => {
  assert.ok(ICON_IDS.length >= 4);
  for (const id of ICON_IDS) {
    const svg = iconSvg(id);
    assert.match(svg, /^<svg viewBox="0 0 24 24"/);
    assert.match(svg, /stroke="currentColor"/, `${id} must follow the look's ink`);
    assert.match(svg, /aria-hidden="true"/);
    assert.doesNotMatch(svg, /#[0-9a-f]{3,6}|<script|on\w+=/i, `${id}: no fixed colours, no script`);
  }
});

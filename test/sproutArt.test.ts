import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPROUT_ART, artFor } from '../src/sproutArt.ts';
import { FAMILIAR } from '../src/familiar.ts';

const names = new Set((JSON.parse(readFileSync(new URL('../public/species/ns.json', import.meta.url), 'utf8')) as { species: { n: string }[] }).species.map(s => s.n));

test('every drawing stands for real list species, and draws', () => {
  assert.equal(new Set(SPROUT_ART.map(a => a.id)).size, SPROUT_ART.length);
  for (const a of SPROUT_ART) {
    assert.ok(a.species.length && a.tell && a.label);
    for (const n of a.species) assert.ok(names.has(n), `${a.id}: ${n} is not in the species list`);
    const svg = a.svg();
    assert.match(svg, /^<svg[\s\S]*<\/svg>$/);
    assert.doesNotMatch(svg, /NaN|undefined/);
  }
});

test('a drawn species is offered as a familiar one, so its picture button appears', () => {
  const familiar = new Set(Object.values(FAMILIAR).flat());
  for (const a of SPROUT_ART) for (const n of a.species) assert.ok(familiar.has(n), `${n} has a drawing but is not a familiar species`);
  assert.equal(artFor('Red Maple')?.id, 'red-maple');
  assert.equal(artFor('Sugar Maple')?.id, 'sugar-maple');
  assert.equal(artFor('Moose'), undefined);
});

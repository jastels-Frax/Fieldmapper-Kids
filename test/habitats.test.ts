import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HABITAT_TYPES, habitatKindToOffer, habitatNamed, habitatsFor, hasPlaceStep, searchHabitats } from '../src/habitats.ts';
import { GROUPS, categoryOf } from '../src/categories.ts';
import { hasSpeciesStep } from '../src/species.ts';

const habitats = GROUPS.find(g => g.id === 'habitats')!;

test('every habitat kind asks "What kind of place?" and none asks for a species', () => {
  for (const k of habitats.kinds) {
    assert.equal(hasPlaceStep(k), true, k);
    assert.equal(hasSpeciesStep(k), false, `${k} would ask both`);
  }
  for (const k of ['plant', 'bird', 'mushroom', 'lichen', 'other', 'mystery'] as const) assert.equal(hasPlaceStep(k), false, k);
});

test('every habitat kind has places to suggest, each named once and said plainly', () => {
  for (const k of habitats.kinds) assert.ok(habitatsFor(k).length >= 5, `${k}: give it suggestions`);
  const names = HABITAT_TYPES.map(t => t.name.toLowerCase());
  assert.equal(new Set(names).size, names.length, 'a place listed twice');
  for (const t of HABITAT_TYPES) {
    assert.ok(habitats.kinds.includes(t.kind), `${t.name}: ${t.kind} is not a habitat kind`);
    assert.equal(categoryOf(t.kind).id, t.kind);
    assert.ok(t.hint && t.hint.length <= 50, `${t.name}: a short hint`);
    assert.ok(t.name.length <= 20, `${t.name}: a short name for a chip`);
  }
});

test('Nova Scotia\'s forests and wetlands are there', () => {
  for (const n of ['Softwood forest', 'Hardwood forest', 'Mixedwood forest', 'Bog', 'Fen', 'Marsh', 'Swamp', 'Salt marsh', 'Barrens', 'Blueberry field', 'Mudflat'])
    assert.ok(habitatNamed(n), n);
});

test('search finds by name or hint, the find\'s own kind first, and is never limited to it', () => {
  assert.equal(searchHabitats('soft', 'forest')[0].name, 'Softwood forest');
  assert.equal(searchHabitats('cumulus', 'sky')[0].name, 'Puffy clouds');
  // Typed in a forest find, a marsh is still found; the salt marsh comes too.
  assert.deepEqual(searchHabitats('marsh', 'forest').map(t => t.name), ['Marsh', 'Salt marsh']);
  // Own kind first among equal matches.
  assert.equal(searchHabitats('pond', 'water')[0].name, 'Pond');
  assert.equal(searchHabitats('pond', 'wetland')[0].name, 'Beaver pond');
  assert.deepEqual(searchHabitats('  ', 'forest'), []);
  assert.deepEqual(searchHabitats('zzz', 'forest'), []);
});

test('typed words match a listed place whatever the capitals', () => {
  assert.equal(habitatNamed('  bog ')?.name, 'Bog');
  assert.equal(habitatNamed('my secret fort'), undefined);
});

test('a place of another kind offers that kind; an everyday place offers nothing', () => {
  assert.equal(habitatKindToOffer('forest', habitatNamed('Bog')!), 'wetland');
  assert.equal(habitatKindToOffer('habitat', habitatNamed('Lake')!), 'water');
  assert.equal(habitatKindToOffer('wetland', habitatNamed('Bog')!), undefined);
  assert.equal(habitatKindToOffer('forest', habitatNamed('Backyard')!), undefined);
});

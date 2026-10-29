import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TAXON_KIND, kindForSpecies, kindToOffer } from '../src/speciesKind.ts';
import { CATEGORY_TAXA, type Species } from '../src/species.ts';
import { categoryOf } from '../src/categories.ts';

const ns = JSON.parse(readFileSync(new URL('../public/species/ns.json', import.meta.url), 'utf8')) as { species: Species[] };
const sp = (n: string) => ns.species.find(s => s.n === n)!;

test('every taxon in the shipped list names a kind, and that kind can name it', () => {
  for (const t of new Set(ns.species.map(s => s.t))) {
    const k = TAXON_KIND[t];
    assert.ok(k, `${t} has no kind`);
    assert.equal(categoryOf(k).id, k);
    assert.ok(CATEGORY_TAXA[k]?.includes(t), `${k} does not name ${t}`);
  }
});

test('a species is the most particular kind that knows it, else its taxon\'s kind', () => {
  assert.equal(kindForSpecies(sp('Red Maple')), 'tree');
  assert.equal(kindForSpecies(sp('Turkey Tail')), 'shelf');
  assert.equal(kindForSpecies(sp('Map Lichen')), 'crusty');
  assert.equal(kindForSpecies(sp('Red Fox')), 'mammal');
  assert.equal(kindForSpecies(sp('Common Juniper')), 'shrub');
  assert.equal(kindForSpecies({ n: 'Some Unfamiliar Aster', t: 'Vascular Plant' }), 'plant');
  assert.equal(kindForSpecies({ n: 'Anything', t: 'Other' }), undefined);
});

test('a species from another kind is offered that kind; one that belongs asks nothing', () => {
  assert.equal(kindToOffer('plant', sp('Turkey Tail')), 'shelf');
  assert.equal(kindToOffer('flower', sp('Red Fox')), 'mammal');
  assert.equal(kindToOffer('shelf', sp('Turkey Tail')), undefined);
  assert.equal(kindToOffer('animal', sp('Red Fox')), undefined, 'an animal can be a fox');
  assert.equal(kindToOffer('sign', sp('Red Fox')), undefined, 'a fox can leave tracks');
  assert.equal(kindToOffer('capstem', sp('Turkey Tail')), undefined, 'every mushroom shape names any fungus');
  // A mystery or "Other" that gets a name is offered the kind it turned out to be.
  assert.equal(kindToOffer('mystery', sp('Red Fox')), 'mammal');
  assert.equal(kindToOffer('other', sp('Turkey Tail')), 'shelf');
  // An imported species of a taxon Scout does not know asks nothing.
  assert.equal(kindToOffer('plant', { n: 'Thing', t: 'Other' }), undefined);
});

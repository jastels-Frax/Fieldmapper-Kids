import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RARE_CARE, isRare, isSoCI, rareLines, saraWords, statusOf } from '../src/rarity.ts';
import type { Species } from '../src/species.ts';

const ns = JSON.parse(readFileSync(new URL('../public/species/ns.json', import.meta.url), 'utf8')) as { region: string; species: Species[] };
const named = (n: string) => ns.species.find(s => s.n === n)!;

test('SOCI is Field Mapper\'s rule: S3 or rarer by the first part of the rank, or a provincial listing', () => {
  for (const r of ['S1', 'S2', 'S3', 'S3?', 'S2S3', 'S3S4', 'S1B', 'S2?B,S3M', 'S1B,S4N', 'S3B,S5M']) assert.equal(isSoCI(r), true, r);
  for (const r of ['S4', 'S5', 'S4S5', 'SNA', 'SU', 'SH', 'SX', 'S4M,S3N', '', undefined]) assert.equal(isSoCI(r), false, String(r));
  for (const p of ['Endangered', 'Threatened', 'Vulnerable', 'Extirpated', 'endangered']) assert.equal(isSoCI('S5', p), true, p);
  assert.equal(isSoCI('S5', 'Extinct'), false, 'Field Mapper does not count Extinct');
});

test('SARA: any listing counts, Not at Risk and Data Deficient do not', () => {
  assert.equal(saraWords('E'), 'endangered');
  assert.equal(saraWords('T'), 'threatened');
  assert.equal(saraWords('SC'), 'of special concern');
  assert.match(saraWords('XT')!, /^extirpated/);
  for (const c of ['NAR', 'DD', '', undefined]) assert.equal(saraWords(c), undefined, String(c));
  assert.equal(isRare({ rank: 'S5', sara: 'SC' }), true);
  assert.equal(isRare({ rank: 'S5', sara: 'NAR' }), false);
  assert.equal(isRare({ rank: 'S4' }), false);
  assert.equal(isRare(undefined), false);
});

test('a pick carries what the list says, and nothing when it says nothing', () => {
  assert.deepEqual(statusOf({ r: 'S3', p: 'Vulnerable', f: 'SC', w: 'Nova Scotia' }), { rank: 'S3', prov: 'Vulnerable', sara: 'SC', where: 'Nova Scotia' });
  assert.equal(statusOf({ w: 'Nova Scotia' }), undefined);
});

test('the words say how rare, and for a rank rare in one season only, which season', () => {
  assert.deepEqual(rareLines({ rank: 'S1', where: 'Nova Scotia' }), ['One of the rarest living things in Nova Scotia.']);
  assert.deepEqual(rareLines({ rank: 'S2S3', where: 'Nova Scotia' }), ['Rare in Nova Scotia: only a few places have it.']);
  assert.deepEqual(rareLines({ rank: 'S3S4' }), ['Uncommon in this province: not many places have it.']);
  assert.deepEqual(rareLines({ rank: 'S1B,S4N', where: 'Nova Scotia' }), ['Very few of these breed in Nova Scotia.']);
  assert.deepEqual(rareLines({ rank: 'S3B,S5M', where: 'Nova Scotia' }), ['Not many of these breed in Nova Scotia.']);
  // Rare in every season it is ranked in: no season named.
  assert.deepEqual(rareLines({ rank: 'S1B,S1N', where: 'Nova Scotia' }), ['One of the rarest living things in Nova Scotia.']);
  assert.deepEqual(rareLines({ rank: 'S1N,SUM', where: 'Nova Scotia' }), ['One of the rarest living things in Nova Scotia.']);
  assert.deepEqual(rareLines({ rank: 'S5', prov: 'Endangered', sara: 'E', where: 'Nova Scotia' }), [
    "Nova Scotia's list of species at risk says it is endangered.",
    "Canada's list of species at risk says it is endangered.",
  ]);
  assert.deepEqual(rareLines({ prov: 'Extirpated' }), ["This province's list of species at risk says it is extirpated: thought to be gone from this province."]);
  assert.match(RARE_CARE, /Leave it/);
});

test('the shipped list carries the statuses, and every one has words', () => {
  assert.equal(ns.region, 'ns');
  const turtle = named('Snapping Turtle');
  assert.deepEqual([turtle.r, turtle.p, turtle.f], ['S3', 'Vulnerable', 'SC']);
  assert.equal(isRare(statusOf(turtle)), true);
  assert.equal(isRare(statusOf(named('Blue Jay'))), false);
  for (const s of ns.species) {
    if (s.f) assert.ok(saraWords(s.f), `${s.n}: SARA ${s.f}`);
    if (s.p) assert.ok(isSoCI(undefined, s.p), `${s.n}: provincial ${s.p}`);
    const st = statusOf(s);
    if (isRare(st)) assert.ok(rareLines(st!).length, `${s.n} is rare but has nothing to say`);
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NICKNAMES, matchesTarget, nicknamesOf } from '../src/nicknames.ts';
import { mergeLists, nicknameFound, searchSpecies, type Species } from '../src/species.ts';
import { BUILT_IN } from '../src/builtIns.ts';

const ns = JSON.parse(readFileSync(new URL('../public/species/ns.json', import.meta.url), 'utf8')) as { species: Species[] };
const all = mergeLists(ns.species, [...BUILT_IN]);
const names = new Set(all.map(sp => sp.n));
const top = (cat: Parameters<typeof searchSpecies>[1], q: string, n = 1) => searchSpecies(all, cat, q, 30).slice(0, n).map(sp => sp.n);

test('every nickname points at something real, and is not itself a name on the lists', () => {
  const seen = new Set<string>();
  for (const [nick, targets] of NICKNAMES) {
    assert.ok(!seen.has(nick.toLowerCase()), `${nick} twice`);
    seen.add(nick.toLowerCase());
    assert.ok(!names.has(nick), `${nick} is already a name`);
    for (const t of targets) {
      if (typeof t === 'string') assert.ok(names.has(t), `${nick}: no ${t}`);
      else assert.ok(all.some(sp => matchesTarget(sp, t)), `${nick}: its rule matches nothing`);
    }
  }
});

test('group nicknames catch the group and nothing else', () => {
  const caught = (nick: string) => all.filter(sp => nicknamesOf(sp).some(x => x.nick === nick)).map(sp => sp.n);
  const lady = caught('Ladybug');
  assert.ok(lady.length >= 20 && lady.every(n => n.endsWith(' Lady Beetle')), 'lady beetles');
  const butterflies = caught('Butterfly');
  assert.ok(butterflies.length >= 50 && butterflies.includes('Monarch') && butterflies.includes('Cabbage White'));
  assert.ok(!butterflies.some(n => / Moth$/.test(n)), 'no moths');
  const dragons = caught('Dragonfly'), damsels = caught('Damselfly');
  assert.ok(dragons.length >= 50 && damsels.length >= 20);
  assert.ok(!dragons.some(n => damsels.includes(n)), 'a dragonfly is not a damselfly');
  assert.ok(damsels.includes('Ebony Jewelwing') && dragons.includes('Common Green Darner'));
  assert.ok(caught('Bumblebee').every(n => n.endsWith(' Bumble Bee')));
  assert.ok(caught('Seagull').every(n => n.endsWith(' Gull')));
  assert.ok(caught("Old Man's Beard").every(n => n.endsWith('Beard Lichen')));
  // Named members are the group's headliners.
  assert.deepEqual(nicknamesOf({ n: 'Seven-spotted Lady Beetle' }).filter(x => x.nick === 'Ladybug'), [{ nick: 'Ladybug', named: true }]);
  assert.deepEqual(nicknamesOf({ n: 'Marsh Lady Beetle' }).filter(x => x.nick === 'Ladybug'), [{ nick: 'Ladybug', named: false }]);
});

test('typing a nickname finds what it stands for, its headliner first, and says which nickname did', () => {
  assert.deepEqual(top('bug', 'ladybug'), ['Seven-spotted Lady Beetle']);
  assert.deepEqual(top('bug', 'lady bug'), ['Seven-spotted Lady Beetle'], 'with a space: one typo');
  assert.deepEqual(top('bug', 'dragonfly'), ['Common Green Darner']);
  assert.deepEqual(top('mammal', 'groundhog'), ['Woodchuck']);
  assert.deepEqual(top('bird', 'seagull'), ['Herring Gull']);
  assert.deepEqual(top('sea', 'starfish'), ['Sea Star']);
  assert.deepEqual(top('flower', 'mayflower'), ['Trailing Arbutus']);
  assert.deepEqual(top('fern', 'fiddlehead'), ['Ostrich Fern']);
  assert.deepEqual(top('houseplant', 'devils ivy'), ['Pothos']);
  assert.deepEqual(top('animal', 'bunny', 2).sort(), ['Rabbit', 'Snowshoe Hare']);
  const sevenSpot = all.find(sp => sp.n === 'Seven-spotted Lady Beetle')!;
  assert.equal(nicknameFound(sevenSpot, 'ladybug'), 'Ladybug');
  assert.equal(nicknameFound(sevenSpot, 'lady bug'), 'Ladybug');
  // Found by its own name: nothing more to say.
  assert.equal(nicknameFound(sevenSpot, 'lady'), undefined);
  assert.equal(nicknameFound(sevenSpot, 'seven'), undefined);
});

test('a nickname never pushes ahead of a real name', () => {
  // "lady" is in the lady beetles' own names (and American Lady's): no nickname needed or shown.
  for (const sp of searchSpecies(all, 'bug', 'lady', 30)) assert.equal(nicknameFound(sp, 'lady'), undefined, sp.n);
  assert.equal(top('animal', 'cat')[0], 'Cat');
  assert.equal(top('shelf', 'turkey')[0], 'Turkey Tail');
});

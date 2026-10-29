import { test } from 'node:test';
import assert from 'node:assert/strict';
import { favouriteFinds, isFavourite, lovedBy, migrateFavourites, toggleFavourite } from '../src/favourites.ts';
import type { Find, Profile } from '../src/types.ts';

const profile = (id: string, favourites?: string[]): Profile => ({ id, name: id, avatar: '🦊', mode: 'explorer', guide: 'frog', createdAt: '', ...(favourites ? { favourites } : {}) });
const find = (id: string, over: Partial<Find> = {}): Find => ({ id, createdAt: '', category: 'bird', colours: [], pictures: [], ...over });

test('an explorer favourites any find, theirs or not, and can take it off', () => {
  let p = profile('a');
  assert.equal(isFavourite(p, 'x'), false);
  p = toggleFavourite(p, 'x');
  assert.equal(isFavourite(p, 'x'), true);
  p = toggleFavourite(p, 'y');
  assert.deepEqual(p.favourites, ['x', 'y']);
  p = toggleFavourite(p, 'x');
  assert.deepEqual(p.favourites, ['y']);
});

test('a card shows the favourites still on the device, the last one loved first', () => {
  const finds = [find('x'), find('y'), find('z')];
  assert.deepEqual(favouriteFinds(profile('a', ['x', 'gone', 'z']), finds).map(f => f.id), ['z', 'x']);
  assert.deepEqual(favouriteFinds(profile('a'), finds), []);
});

test('a find says who loves it', () => {
  const everyone = [profile('a', ['x']), profile('b'), profile('c', ['y', 'x'])];
  assert.deepEqual(lovedBy(everyone, 'x').map(p => p.id), ['a', 'c']);
  assert.deepEqual(lovedBy(everyone, 'z'), []);
});

test('old favourite flags move to the finder, once', () => {
  const profiles = [profile('a'), profile('b', ['q'])];
  const finds = [find('1', { profileId: 'a', favourite: true }), find('2', { profileId: 'b', favourite: true }),
    find('3', { favourite: true }), find('4', { profileId: 'a', favourite: false }), find('5', { profileId: 'a' })];
  const m = migrateFavourites(finds, profiles, 'a');
  assert.deepEqual(m.profiles.map(p => [p.id, p.favourites]), [['a', ['1', '3']], ['b', ['q', '2']]]);
  assert.deepEqual(m.finds.map(f => f.id), ['1', '2', '3', '4'], 'every find carrying the old flag loses it');
  assert.ok(m.finds.every(f => !('favourite' in f)));
  // Run again on the result: nothing left to move.
  const again = migrateFavourites(m.finds, m.profiles, 'a');
  assert.deepEqual(again, { profiles: [], finds: [] });
});

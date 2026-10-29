import { test } from 'node:test';
import assert from 'node:assert/strict';
import { badgeProgress, newlyEarned, farthestApartM, type BadgeFind } from '../src/badges.ts';

const clock = { dayOf: (iso: string) => iso.slice(0, 10), hourOf: (iso: string) => Number(iso.slice(11, 13)) };
const find = (over: Partial<BadgeFind> = {}): BadgeFind => ({ createdAt: '2026-05-01T12:00:00Z', category: 'mystery', colours: [], ...over });
const byId = (finds: BadgeFind[]) => Object.fromEntries(badgeProgress(finds, clock).map(b => [b.id, b]));

test('no finds earns nothing', () => {
  assert.ok(badgeProgress([], clock).every(b => !b.earned && b.value === 0));
});

test('first find', () => {
  assert.equal(byId([find()]).first.earned, true);
  assert.equal(byId([find()]).ten.value, 1);
});

test('category badge counts only its category and caps at the target', () => {
  const birds = Array.from({ length: 7 }, () => find({ category: 'bird' }));
  const b = byId([...birds, find({ category: 'bug' })]);
  assert.equal(b.birds.value, 5);
  assert.equal(b.birds.earned, true);
  assert.equal(b.bugs.value, 1);
});

test('rainbow counts distinct colours across finds', () => {
  const b = byId([find({ colours: ['red', 'blue'] }), find({ colours: ['red', 'green', 'yellow'] })]);
  assert.equal(b.rainbow.value, 4);
});

test('one of everything ignores mysteries', () => {
  const cats = ['bird', 'bug', 'plant', 'tree', 'flower', 'animal', 'sign', 'rock', 'water'] as const;
  const b = byId([...cats.map(category => find({ category })), find({ category: 'mystery' })]);
  assert.equal(b.everything.earned, false);
  assert.equal(byId([...cats.map(category => find({ category })), find({ category: 'sky' })]).everything.earned, true);
});

test('time and day badges read the clock', () => {
  const b = byId([find({ createdAt: '2026-05-01T07:30:00Z' }), find({ createdAt: '2026-05-02T20:00:00Z' }), find({ createdAt: '2026-05-03T12:00:00Z' })]);
  assert.equal(b.early.earned, true);
  assert.equal(b.evening.earned, true);
  assert.equal(b.days3.earned, true);
  assert.equal(b.days7.value, 3);
});

test('far explorer needs a kilometre between located finds', () => {
  const a = find({ lat: 44.65, lon: -63.57 });
  const near = find({ lat: 44.651, lon: -63.57 }); // ~111 m
  const far = find({ lat: 44.66, lon: -63.57 });   // ~1.1 km
  assert.ok(farthestApartM([a, near]) < 200);
  assert.equal(byId([a, near]).far.earned, false);
  assert.equal(byId([a, far]).far.earned, true);
  assert.equal(byId([a, find()]).far.earned, false);
});

test('newlyEarned reports only the change', () => {
  const before = [find({ category: 'bird' })];
  const after = [...before, find({ category: 'bird', hasDrawing: true })];
  assert.deepEqual(newlyEarned(before, after, clock).map(b => b.id), []);
  assert.deepEqual(newlyEarned([], before, clock).map(b => b.id), ['first']);
});

test('hunt badges count finished hunts', () => {
  assert.equal(badgeProgress([], clock, { huntsCompleted: 1 }).find(b => b.id === 'hunt1')!.earned, true);
  assert.equal(badgeProgress([], clock, { huntsCompleted: 1 }).find(b => b.id === 'hunt3')!.value, 1);
  assert.deepEqual(newlyEarned([], [], clock, { huntsCompleted: 0 }, { huntsCompleted: 1 }).map(b => b.id), ['hunt1']);
});

test('tick checker counts finished checks', () => {
  assert.equal(badgeProgress([], clock, { tickChecks: 2 }).find(b => b.id === 'ticks')!.earned, false);
  assert.equal(badgeProgress([], clock, { tickChecks: 3 }).find(b => b.id === 'ticks')!.earned, true);
});

test('track detective and species spotter', () => {
  const b = byId([find({ category: 'sign' }), find({ category: 'sign' }), find({ category: 'sign', species: 'Red Fox' }),
    find({ species: 'Red Fox' }), find({ species: 'Blue Jay' }), find({ species: 'Moose' }), find({ species: 'Raccoon' })]);
  assert.equal(b.signs.earned, true);
  assert.equal(b.species.value, 4);
});

test('path badges read the recorded walks', () => {
  const b = Object.fromEntries(badgeProgress([], clock, { walks: 2, longestWalkM: 1200 }).map(x => [x.id, x]));
  assert.equal(b.path1.earned, true);
  assert.equal(b.path1k.earned, true);
  assert.equal(Object.fromEntries(badgeProgress([], clock, { walks: 1, longestWalkM: 999 }).map(x => [x.id, x])).path1k.earned, false);
});

test('photo spot badges count spots, and spots taken again on another day', () => {
  const at = (x: object) => Object.fromEntries(badgeProgress([], clock, x).map(b => [b.id, b]));
  assert.equal(at({ photoSpots: 2 }).spots.earned, false);
  assert.equal(at({ photoSpots: 3 }).spots.earned, true);
  assert.equal(at({ spotsRetaken: 0 }).thenNow.earned, false);
  assert.equal(at({ spotsRetaken: 1 }).thenNow.earned, true);
});

test('kinds added with the groups count as the older kind they refine', () => {
  const b = byId([find({ category: 'shelf' }), find({ category: 'puffball' }), find({ category: 'capstem' })]);
  assert.equal(b.mushrooms.earned, true);
  assert.equal(byId([find({ category: 'mammal' }), find({ category: 'fish' })]).animals.value, 2);
  // "One of everything" takes a fern as its plant: the badge is not made harder by the new kinds.
  assert.equal(byId([find({ category: 'fern' })]).everything.value, 1);
  assert.equal(byId([find({ category: 'plant' }), find({ category: 'fern' })]).everything.value, 1);
});

test('lichens and places', () => {
  assert.equal(byId([find({ category: 'crusty' }), find({ category: 'leafy' }), find({ category: 'lichen' })]).lichens.earned, true);
  const places = byId([find({ category: 'forest' }), find({ category: 'forest' }), find({ category: 'water' }), find({ category: 'rock' }), find({ category: 'sky' })]);
  assert.equal(places.places.value, 2, 'two kinds of place; rock and sky are things, not places');
  assert.equal(byId([find({ category: 'forest' }), find({ category: 'wetland' }), find({ category: 'beach' })]).places.earned, true);
});

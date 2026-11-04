import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TOUR, fill, introFor, markSeen, pendingSteps, stepToShow, tourStarted } from '../src/tourSteps.ts';
import { CRITTERS } from '../src/critters.ts';
import { TOOLS } from '../src/railTools.ts';

const app = readFileSync(new URL('../src/App.ts', import.meta.url), 'utf8');

test('step ids are unique, and every step has words short enough to read aloud', () => {
  assert.equal(new Set(TOUR.map(s => s.id)).size, TOUR.length);
  for (const s of TOUR) {
    assert.ok(s.rev >= 1, s.id);
    assert.ok(s.title.length <= 40, `${s.id}: title too long`);
    assert.ok(s.body.split(/\s+/).length <= 32, `${s.id}: body too long for a child`);
  }
});

test('every one of the crew explains their own part, and the guide opens and closes', () => {
  for (const c of CRITTERS) assert.ok(TOUR.some(s => s.speaker === c), `${c} has no step`);
  assert.equal(TOUR[0].speaker, 'guide');
  assert.equal(TOUR[TOUR.length - 1].speaker, 'guide');
  // Who says what: each crew member's step is about their job (cast.ts).
  const by = (id: string) => TOUR.find(s => s.id === id)!.speaker;
  assert.equal(by('finds'), 'squirrel');
  assert.equal(by('facts'), 'owl');
  assert.equal(by('badges'), 'moose');
  assert.equal(by('challenges'), 'raccoon');
  assert.equal(by('hunts'), 'fox');
  assert.equal(by('safety'), 'bear');
});

test('every target is something App draws: a map button by its class, or a named part of the screen', () => {
  for (const s of TOUR) {
    if (!s.target) continue;
    const btn = /^\.([a-z]+)-btn$/.exec(s.target);
    if (btn && TOOLS.some(t => t.id === btn[1])) continue;
    const parts = s.target.split(/[.#\s]+/).filter(Boolean);
    for (const part of parts) assert.ok(app.includes(part), `${s.id}: "${part}" is not in App.ts`);
  }
});

test('only what was not seen at its version is shown again', () => {
  const none = pendingSteps(TOUR, {});
  assert.equal(none.length, TOUR.length, 'a new explorer gets every step');
  const all = markSeen({}, TOUR);
  assert.deepEqual(pendingSteps(TOUR, all), []);
  const bumped = TOUR.map(s => (s.id === 'hunts' ? { ...s, rev: s.rev + 1 } : s));
  assert.deepEqual(pendingSteps(bumped, all).map(s => s.id), ['hunts']);
  assert.ok(!tourStarted(TOUR, {}));
  assert.ok(tourStarted(TOUR, all));
  // A step never shown (its button not on screen) stays pending.
  const some = markSeen({}, TOUR.filter(s => s.id !== 'path'));
  assert.deepEqual(pendingSteps(TOUR, some).map(s => s.id), ['path']);
});

test('the opening card, the words filled in, and a missing target', () => {
  assert.equal(introFor(TOUR, {}, 'Hop', 'Everly').title, 'Hi Everly! I am Hop.');
  assert.equal(introFor(TOUR, markSeen({}, TOUR), 'Hop', 'Everly').title, 'Some things are new!');
  assert.equal(fill('That is you, {name}! {guide} says hi.', '', 'Pip'), 'That is you, explorer! Pip says hi.');
  const path = TOUR.find(s => s.id === 'path')!;
  const hunts = TOUR.find(s => s.id === 'hunts')!;
  assert.equal(stepToShow(path, true), 'target');
  assert.equal(stepToShow(path, false), 'skip', 'a map tool not on screen is skipped');
  assert.equal(stepToShow(hunts, false), 'centre', 'a crew member explains their part anyway');
  assert.equal(stepToShow(TOUR.find(s => s.id === 'hold')!, false), 'centre');
});

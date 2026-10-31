import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_BAR, barFor, placeInBar, railFor, railFromOld, moveTool, toggleTool, TIER_TOOLS, TOOLS, type ToolId } from '../src/railTools.ts';

test('no choice: the tier default, and every default is a real tool', () => {
  assert.deepEqual(railFor({}, 'sprout'), TIER_TOOLS.sprout);
  for (const list of Object.values(TIER_TOOLS)) for (const id of list) assert.ok(TOOLS.some(t => t.id === id), id);
  assert.ok(TIER_TOOLS.sprout.length < TIER_TOOLS.naturalist.length, 'little ones get fewer buttons');
});

test('the bar starts as My Finds on the left and Photo on the right, and Badges has Photo\'s old place on the rail', () => {
  assert.deepEqual(barFor(undefined), ['finds', 'photo']);
  assert.deepEqual([...DEFAULT_BAR], ['finds', 'photo']);
  assert.deepEqual(TIER_TOOLS.explorer, ['me', 'map', 'badges', 'draw', 'path', 'hunts', 'done']);
  // Nothing in a tier's rail is in the default bar: a button is in one place or the other.
  for (const list of Object.values(TIER_TOOLS)) for (const id of DEFAULT_BAR) assert.ok(!list.includes(id), id);
});

test('a bar choice is honoured; an unknown or doubled one falls back', () => {
  assert.deepEqual(barFor(['map', 'badges']), ['map', 'badges']);
  assert.deepEqual(barFor(['gone', 'badges']), ['finds', 'badges']);
  assert.deepEqual(barFor(['map', 'map']), ['finds', 'photo']);
  assert.deepEqual(barFor(['map']), ['map', 'photo']);
});

test('a rail choice is honoured, cleaned of unknown and repeated ids, even when empty, less the bar\'s buttons', () => {
  assert.deepEqual(railFor({ rail: ['hunts', 'me', 'gone', 'me'] }, 'explorer'), ['hunts', 'me']);
  assert.deepEqual(railFor({ rail: [] }, 'explorer'), []);
  assert.deepEqual(railFor({ rail: ['me', 'photo', 'finds', 'hunts'] }, 'explorer'), ['me', 'hunts']);
  assert.deepEqual(railFor({ rail: ['me', 'photo', 'finds'], bar: ['me', 'hunts'] }, 'explorer'), ['photo', 'finds']);
});

test('a rail stored before 2.12: Badges takes Photo\'s place, or the end, and nothing on screen leaves it', () => {
  assert.deepEqual(railFromOld(['me', 'photo', 'draw']), ['me', 'badges', 'draw']);
  assert.deepEqual(railFromOld(['me', 'draw']), ['me', 'draw', 'badges']);
  assert.deepEqual(railFromOld([]), ['badges']);
  assert.deepEqual(railFor({ tools: ['hunts', 'photo', 'me'] }, 'explorer'), ['hunts', 'badges', 'me']);
  // A rail chosen in 2.12 is read as it is, never the old way.
  assert.deepEqual(railFor({ rail: ['me'], tools: ['photo', 'draw'] }, 'explorer'), ['me']);
  // Everything an explorer had on screen before (their rail, My Finds, Badges) is still there.
  const before: ToolId[] = ['me', 'photo', 'draw', 'hunts'];
  const after = [...railFor({ tools: before }, 'explorer'), ...barFor(undefined)];
  for (const id of [...before, 'finds', 'badges'] as ToolId[]) assert.ok(after.includes(id), id);
});

test('placing a button in the bar swaps out the one there, so no button is lost', () => {
  const bar: [ToolId, ToolId] = ['finds', 'photo'];
  // From the rail: the old one takes its spot on the rail.
  assert.deepEqual(placeInBar(bar, ['me', 'badges', 'hunts'], 1, 'badges'), { bar: ['finds', 'badges'], rail: ['me', 'photo', 'hunts'] });
  // From the other side: the two swap sides.
  assert.deepEqual(placeInBar(bar, ['me'], 0, 'photo'), { bar: ['photo', 'finds'], rail: ['me'] });
  // From off the map: the old one goes to the end of the rail.
  assert.deepEqual(placeInBar(bar, ['me', 'hunts'], 0, 'measure'), { bar: ['measure', 'photo'], rail: ['me', 'hunts', 'finds'] });
  // The same button: nothing changes.
  assert.deepEqual(placeInBar(bar, ['me'], 0, 'finds'), { bar: ['finds', 'photo'], rail: ['me'] });
  // Every swap keeps every button on screen.
  for (const t of TOOLS) for (const slot of [0, 1] as const) {
    const rail: ToolId[] = ['me', 'map', 'badges', 'draw'];
    const next = placeInBar(bar, rail, slot, t.id);
    for (const id of [...rail, ...bar]) assert.ok([...next.rail, ...next.bar].includes(id), `${t.id} in ${slot}: lost ${id}`);
    assert.ok(!next.rail.some(id => next.bar.includes(id)), 'a button in both places');
  }
});

test('move and toggle', () => {
  assert.deepEqual(moveTool(['me', 'map', 'done'], 'done', -1), ['me', 'done', 'map']);
  assert.deepEqual(moveTool(['me', 'map'], 'me', -1), ['me', 'map']);
  assert.deepEqual(toggleTool(['me'], 'draw'), ['me', 'draw']);
  assert.deepEqual(toggleTool(['me', 'draw'], 'me'), ['draw']);
});

test('every button has a word short enough for the rail', () => {
  for (const t of TOOLS) assert.ok((t.short ?? t.word).length <= 7, `${t.id}: "${t.short ?? t.word}" is too long for the rail`);
});

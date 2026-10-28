import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metresPerPixel, pickShape, sketchFacts, walkFacts } from '../src/mapShapes.ts';
import type { Sketch } from '../src/types.ts';
import type { Walk } from '../src/walk.ts';

const sk = (id: string, kind: Sketch['kind'], points: [number, number][]): Sketch => ({ id, kind, points, colour: '#e8590c', createdAt: '2026-10-28T10:00:00Z' });
const walk = (id: string, coords: [number, number][]): Walk => ({
  id, startedAt: '2026-10-28T10:00:00Z', endedAt: '2026-10-28T11:00:00Z', points: coords.map(([lon, lat], i) => ({ lon, lat, t: Date.parse('2026-10-28T10:00:00Z') + i * 60000, acc: 5 })),
});

// About 100 m squares near Halifax.
const big = sk('big', 'area', [[-63.6, 44.65], [-63.598, 44.65], [-63.598, 44.6515], [-63.6, 44.6515]]);
const small = sk('small', 'area', [[-63.5992, 44.6505], [-63.5988, 44.6505], [-63.5988, 44.6508], [-63.5992, 44.6508]]);
const line = sk('line', 'line', [[-63.59, 44.65], [-63.58, 44.65]]);

test('a tap inside a shape picks it; inside a smaller one inside it, the smaller', () => {
  assert.equal((pickShape([big, small], [], -63.5995, 44.6502, 10) as { sketch: Sketch }).sketch.id, 'big');
  assert.equal((pickShape([big, small], [], -63.599, 44.65065, 10) as { sketch: Sketch }).sketch.id, 'small');
});

test('a line is hit along its length within the tolerance, and missed outside it', () => {
  // Halfway along, 5 m north of the line.
  assert.equal((pickShape([line], [], -63.585, 44.65 + 5 / 111320, 10) as { sketch: Sketch }).sketch.id, 'line');
  assert.equal(pickShape([line], [], -63.585, 44.65 + 30 / 111320, 10), null);
});

test('a finished path is pickable; one still recording is not', () => {
  const coords: [number, number][] = [[-63.57, 44.66], [-63.569, 44.66], [-63.568, 44.66]];
  assert.equal(pickShape([], [walk('w', coords)], -63.5695, 44.66, 10)?.kind, 'walk');
  assert.equal(pickShape([], [{ ...walk('w', coords), endedAt: undefined }], -63.5695, 44.66, 10), null);
});

test('metres per pixel halves with each zoom level and shrinks towards the poles', () => {
  assert.ok(Math.abs(metresPerPixel(0, 0) - 78271.5) < 1);
  assert.ok(Math.abs(metresPerPixel(0, 1) * 2 - metresPerPixel(0, 0)) < 1e-6);
  assert.ok(metresPerPixel(60, 10) < metresPerPixel(0, 10) * 0.51);
});

test('cards say what a drawing or path is, by its name when it has one', () => {
  assert.equal(sketchFacts(line).title, 'My line');
  assert.match(sketchFacts(line).facts[0], /^Long: /);
  assert.equal(sketchFacts({ ...big, name: 'Fort' }).title, 'Fort');
  assert.match(sketchFacts(big).facts[0], /^Inside: /);
  assert.equal(walkFacts(walk('w', [[-63.57, 44.66], [-63.569, 44.66]])).title, 'My path');
});

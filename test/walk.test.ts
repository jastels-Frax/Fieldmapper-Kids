import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addPoint, judgePoint, walkLengthM, closeOrphan, distanceWords, durationWords, walkGeoJSON, type WalkPoint } from '../src/walk.ts';

const pt = (dLatM: number, tSec: number, acc = 5): WalkPoint => ({ lon: -63.57, lat: 44.65 + dLatM / 111_195, t: 1_700_000_000_000 + tSec * 1000, acc });

test('wobble, fuzzy fixes and jumps are left out', () => {
  let pts: WalkPoint[] = [];
  pts = addPoint(pts, pt(0, 0)).points;
  assert.equal(judgePoint(pts, pt(2, 5)), 'too-close');
  assert.equal(judgePoint(pts, pt(20, 10, 80)), 'fuzzy');
  assert.equal(judgePoint(pts, pt(500, 10)), 'jump');
  const r = addPoint(pts, pt(10, 10));
  assert.equal(r.verdict, 'kept');
  assert.equal(r.points.length, 2);
});

test('length adds up the kept steps', () => {
  const pts = [pt(0, 0), pt(100, 60), pt(200, 120)];
  assert.ok(Math.abs(walkLengthM(pts) - 200) < 1);
});

test('a walk interrupted by closing the app ends at its last point', () => {
  const w = closeOrphan({ id: 'w', startedAt: new Date(1_700_000_000_000).toISOString(), points: [pt(0, 0), pt(10, 90)] });
  assert.equal(w.endedAt, new Date(1_700_000_090_000).toISOString());
});

test('words and GeoJSON', () => {
  assert.equal(distanceWords(123), '120 m');
  assert.equal(distanceWords(1234), '1.2 km');
  assert.equal(durationWords(20_000), 'less than a minute');
  assert.equal(durationWords(95 * 60000), '1 h 35 min');
  const g = walkGeoJSON({ id: 'w', startedAt: new Date(1_700_000_000_000).toISOString(), endedAt: new Date(1_700_000_120_000).toISOString(), points: [pt(0, 0), pt(100, 60)] }) as { geometry: { type: string }; properties: { length_m: number; minutes: number } };
  assert.equal(g.geometry.type, 'LineString');
  assert.equal(g.properties.length_m, 100);
  assert.equal(g.properties.minutes, 2);
});

test('a path is broken where the GPS went quiet, never bridged', async () => {
  const { segmentsAtGaps } = await import('../src/walk.ts');
  const at = (t: number) => ({ lon: -63.57, lat: 44.65 + t / 1e7, t, acc: 5 });
  const segs = segmentsAtGaps([at(0), at(10_000), at(20_000), at(200_000), at(210_000), at(900_000)]);
  assert.equal(segs.length, 2); // the lone last point makes no line
  assert.deepEqual(segs.map(s => s.length), [3, 2]);
  assert.deepEqual(segmentsAtGaps([at(0)]), []);
});

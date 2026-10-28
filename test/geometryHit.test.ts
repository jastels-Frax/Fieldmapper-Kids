// COPIED from Fraxinus Field Mapper's test/geometryHit.test.ts, beside src/geometryHit.ts: keep in step.
// Geometry hit-testing. Run with: npm test
//
// The properties worth pinning are the ones that decide whether a tap lands:
// Multi* must be measured rather than skipped (a pasted MultiPolygon was
// unhittable, which is most of "single select is inconsistent"), a line must be
// measured to its SEGMENTS rather than its vertices, and a tie between two
// shapes that both hold the tap must resolve to the one you can see on top.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  measureGeometry, distanceToPointM, geometryRank, betterHit, pickNearest,
  type GeoJSONGeometry,
} from '../src/geometryHit.ts';

const g = (o: unknown): GeoJSONGeometry => o as GeoJSONGeometry;

/** Metres per degree of longitude at the equator, matching the module's constant. */
const M_PER_DEG = 111320;

/** A closed square ring, [w,s] to [e,n]. */
const ring = (w: number, s: number, e: number, n: number): number[][] =>
  [[w, s], [e, s], [e, n], [w, n], [w, s]];

const square = (w: number, s: number, e: number, n: number): GeoJSONGeometry =>
  g({ type: 'Polygon', coordinates: [ring(w, s, e, n)] });

// ---- rank --------------------------------------------------------------------

test('geometryRank folds Multi* onto its part kind', () => {
  assert.equal(geometryRank(g({ type: 'Point' })), 0);
  assert.equal(geometryRank(g({ type: 'MultiPoint' })), 0);
  assert.equal(geometryRank(g({ type: 'LineString' })), 1);
  assert.equal(geometryRank(g({ type: 'MultiLineString' })), 1);
  assert.equal(geometryRank(g({ type: 'Polygon' })), 2);
  assert.equal(geometryRank(g({ type: 'MultiPolygon' })), 2);
  assert.equal(geometryRank(g({ type: 'Nonsense' })), 3);
  assert.equal(geometryRank(null), 3);
});

// ---- distance ----------------------------------------------------------------

test('a point is measured in metres from the tap', () => {
  const d = distanceToPointM(g({ type: 'Point', coordinates: [0.001, 0] }), 0, 0);
  assert.ok(Math.abs(d - 0.001 * M_PER_DEG) < 0.5, `got ${d}`);
});

test('a MultiPoint takes its nearest part', () => {
  const d = distanceToPointM(
    g({ type: 'MultiPoint', coordinates: [[5, 5], [0.001, 0]] }), 0, 0,
  );
  assert.ok(Math.abs(d - 0.001 * M_PER_DEG) < 0.5, `got ${d}`);
});

test('a line is measured to its segments, not to its vertices', () => {
  // A tap 11 m off the MIDDLE of a 220 km span. The nearest vertex is ~111 km
  // away, so a vertex-to-vertex measure reads this as a miss.
  const line = g({ type: 'LineString', coordinates: [[-1, 0], [1, 0]] });
  const d = distanceToPointM(line, 0, 0.0001);
  assert.ok(d < 12, `expected ~11 m, got ${d}`);
});

test('a one-vertex line degrades to that vertex', () => {
  const d = distanceToPointM(g({ type: 'LineString', coordinates: [[0.001, 0]] }), 0, 0);
  assert.ok(Math.abs(d - 0.001 * M_PER_DEG) < 0.5, `got ${d}`);
});

test('a MultiLineString takes its nearest part', () => {
  const ml = g({
    type: 'MultiLineString',
    coordinates: [[[10, 10], [11, 10]], [[-1, 0], [1, 0]]],
  });
  assert.ok(distanceToPointM(ml, 0, 0.0001) < 12);
});

test('a tap inside a polygon is zero, outside is the edge distance', () => {
  const poly = square(-1, -1, 1, 1);
  assert.equal(distanceToPointM(poly, 0, 0), 0);
  const outside = distanceToPointM(poly, 2, 0);
  assert.ok(Math.abs(outside - M_PER_DEG) < 5, `got ${outside}`);
});

test('a tap in a HOLE is not inside the polygon', () => {
  const donut = g({
    type: 'Polygon',
    coordinates: [ring(-1, -1, 1, 1), ring(-0.5, -0.5, 0.5, 0.5)],
  });
  const d = distanceToPointM(donut, 0, 0);
  assert.ok(d > 0, 'a tap in the hole must not read as inside');
  assert.ok(Math.abs(d - 0.5 * M_PER_DEG) < 5, `got ${d}`);
});

test('a MultiPolygon is hit on ANY of its parts — the pasted-feature case', () => {
  // Exactly what a paste into an editable layer stores: several polygons packaged
  // as one feature. The old hit test skipped Multi* outright, so this returned
  // Infinity and the feature could not be tapped, selected or merged.
  const mp = g({
    type: 'MultiPolygon',
    coordinates: [[ring(10, 10, 11, 11)], [ring(-1, -1, 1, 1)]],
  });
  assert.equal(distanceToPointM(mp, 0, 0), 0);
});

test('a GeometryCollection takes its best member', () => {
  const gc = g({
    type: 'GeometryCollection',
    geometries: [
      { type: 'Point', coordinates: [50, 50] },
      { type: 'Point', coordinates: [0.001, 0] },
    ],
  });
  assert.ok(distanceToPointM(gc, 0, 0) < 120);
});

test('an unrecognised or empty geometry misses rather than throwing', () => {
  assert.equal(distanceToPointM(null, 0, 0), Infinity);
  assert.equal(distanceToPointM(g({ type: 'Nonsense', coordinates: [] }), 0, 0), Infinity);
  assert.equal(distanceToPointM(g({ type: 'LineString', coordinates: [] }), 0, 0), Infinity);
  assert.equal(distanceToPointM(g({ type: 'Polygon', coordinates: [] }), 0, 0), Infinity);
});

test('spanM reports the whole feature, both parts of a Multi included', () => {
  const mp = g({
    type: 'MultiPolygon',
    coordinates: [[ring(-1, -1, 1, 1)], [ring(9, 9, 10, 10)]],
  });
  const m = measureGeometry(mp, 0, 0);
  assert.equal(m.distanceM, 0);
  // Diagonal of [-1,-1]..[10,10] in metres, not the diagonal of the first part.
  assert.ok(m.spanM > 11 * M_PER_DEG, `got ${m.spanM}`);
});

// ---- ranking -----------------------------------------------------------------

test('betterHit prefers rank, then distance, then the smaller shape', () => {
  const pt = { distanceM: 100, rank: 0, spanM: 0 };
  const poly = { distanceM: 0, rank: 2, spanM: 10 };
  assert.equal(betterHit(pt, poly), true, 'a nearby point beats a containing polygon');

  const near = { distanceM: 1, rank: 2, spanM: 100 };
  const far = { distanceM: 9, rank: 2, spanM: 1 };
  assert.equal(betterHit(near, far), true, 'same rank → nearest wins');

  const small = { distanceM: 0, rank: 2, spanM: 10 };
  const big = { distanceM: 0, rank: 2, spanM: 1000 };
  assert.equal(betterHit(small, big), true, 'a genuine tie → the smaller shape wins');
});

// ---- pickNearest -------------------------------------------------------------

test('pickNearest gives the point drawn over a polygon, not the polygon', () => {
  const parcel = { name: 'parcel', geometry: square(-1, -1, 1, 1) };
  const marker = { name: 'marker', geometry: g({ type: 'Point', coordinates: [0.0001, 0] }) };
  const hit = pickNearest([parcel, marker], 0, 0, 100);
  assert.equal(hit?.name, 'marker');
});

test('pickNearest gives the smaller of two polygons that both hold the tap', () => {
  const big = { name: 'big', geometry: square(-10, -10, 10, 10) };
  const small = { name: 'small', geometry: square(-1, -1, 1, 1) };
  assert.equal(pickNearest([big, small], 0, 0, 0)?.name, 'small');
  assert.equal(pickNearest([small, big], 0, 0, 0)?.name, 'small', 'order must not decide it');
});

test('pickNearest reaches a multi-part feature', () => {
  const pasted = {
    name: 'pasted',
    geometry: g({ type: 'MultiPolygon', coordinates: [[ring(5, 5, 6, 6)], [ring(-1, -1, 1, 1)]] }),
  };
  assert.equal(pickNearest([pasted], 0, 0, 0)?.name, 'pasted');
});

test('pickNearest returns null past the tolerance, and skips geometry-less rows', () => {
  const far = { name: 'far', geometry: g({ type: 'Point', coordinates: [0.01, 0] }) };
  assert.equal(pickNearest([far], 0, 0, 10), null);
  assert.equal(pickNearest([{ name: 'none', geometry: null }], 0, 0, 1e9), null);
  assert.equal(pickNearest([], 0, 0, 1e9), null);
});

test('pickNearest honours the tolerance as a limit, not a hint', () => {
  const pt = { name: 'pt', geometry: g({ type: 'Point', coordinates: [0.001, 0] }) };
  assert.equal(pickNearest([pt], 0, 0, 111), null, '111.32 m is outside a 111 m tolerance');
  assert.equal(pickNearest([pt], 0, 0, 120)?.name, 'pt');
});

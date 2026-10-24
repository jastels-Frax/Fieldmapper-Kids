import { test } from 'node:test';
import assert from 'node:assert/strict';
import { steadyFix, type SteadySample } from '../src/gpsSteady.ts';
import { distanceM as haversineDistance } from '../src/geo.ts';

// Copied from Field Mapper's test/gpsSteady.test.ts; only this east/west offset helper replaces its geodesy import.
const destination = (lat: number, lon: number, bearing: number, m: number) =>
  ({ lat, lon: lon + (bearing === 90 ? 1 : -1) * m / (111320 * Math.cos(lat * Math.PI / 180)) });

const LAT = 44.65, LON = -63.57;
function at(dx: number, t: number, acc = 4): SteadySample {
  const { lat, lon } = dx === 0 ? { lat: LAT, lon: LON } : destination(LAT, LON, dx >= 0 ? 90 : 270, Math.abs(dx));
  return { lat, lon, elevation: 30, accuracy: acc, timestamp: t };
}

test('no fixes, no position', () => {
  assert.equal(steadyFix([]), null);
});

test('a single jumped fix is left out and does not move the result', () => {
  const fixes = [0, 0.3, -0.2, 25, 0.1, -0.1].map((dx, i) => at(dx, 1000 * i));
  const r = steadyFix(fixes)!;
  assert.equal(r.rejected, 1);
  assert.equal(r.samples, 5);
  assert.ok(haversineDistance(LAT, LON, r.lat, r.lon) < 0.3);
  assert.equal(r.unsettled, false);
});

test('the window is measured back from the newest fix and dedupes by time', () => {
  const fixes = [at(40, 0), at(0, 20000), at(0.2, 21000), at(0.2, 21000), at(-0.2, 22000)];
  const r = steadyFix(fixes)!;
  assert.equal(r.samples, 3); // the fix 20 s older is outside the window; the repeat counted once
  assert.equal(r.windowS, 2);
});

test('too few fixes, or more jumps than not, is unsettled', () => {
  assert.equal(steadyFix([at(0, 0), at(0.1, 1000)])!.unsettled, true);
  const scattered = [0, 30, -30, 60, 0.1].map((dx, i) => at(dx, 1000 * i));
  assert.equal(steadyFix(scattered)!.unsettled, true);
});

test('ordinary jitter under the floor is kept', () => {
  const fixes = [0, 1.5, -1.5, 2, -2, 0.5].map((dx, i) => at(dx, 1000 * i));
  const r = steadyFix(fixes)!;
  assert.equal(r.rejected, 0);
  assert.ok(r.spreadM > 1.5 && r.spreadM < 2.5);
});

test('reported accuracy is a median of the kept fixes and never weights the position', () => {
  const fixes = [at(0, 0, 3), at(0.1, 1000, 50), at(-0.1, 2000, 5)];
  const r = steadyFix(fixes)!;
  assert.equal(r.accuracy, 5);
  assert.ok(haversineDistance(LAT, LON, r.lat, r.lon) < 0.15);
});

test('fixes past the accuracy limit are not used; none within it is no position', () => {
  const fixes = [at(0, 0, 4), at(0.2, 1000, 40), at(-0.2, 2000, 5), at(30, 3000, 60)];
  const r = steadyFix(fixes, { maxAccuracyM: 20 })!;
  assert.equal(r.samples, 2);
  assert.equal(r.accuracy, 4.5);
  assert.equal(steadyFix([at(0, 0, 40), at(0, 1000, 35)], { maxAccuracyM: 20 }), null);
});

test('a coarse run now never falls back on good fixes from a minute ago', () => {
  const fixes = [at(0, 0, 3), at(0, 1000, 3), at(5, 60000, 50), at(5, 61000, 50)];
  assert.equal(steadyFix(fixes, { maxAccuracyM: 20 }), null);
});

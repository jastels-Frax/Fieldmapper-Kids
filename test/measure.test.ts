import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areaM2, pathLengthM, perimeterM, distanceKid, areaKid, distanceWords, areaWords, type LonLat } from '../src/measure.ts';

const LAT = 44.65, LON = -63.57;
const mPerDegLat = 111_195;
const mPerDegLon = 111_195 * Math.cos(LAT * Math.PI / 180);
const at = (eastM: number, northM: number): LonLat => [LON + eastM / mPerDegLon, LAT + northM / mPerDegLat];

test('a 100 m line is about 100 m', () => {
  assert.ok(Math.abs(pathLengthM([at(0, 0), at(100, 0)]) - 100) < 0.5);
});

test('a 100 m square is about a hectare, with a 400 m outline', () => {
  const sq = [at(0, 0), at(100, 0), at(100, 100), at(0, 100)];
  assert.ok(Math.abs(areaM2(sq) - 10_000) / 10_000 < 0.01, String(areaM2(sq)));
  assert.ok(Math.abs(areaM2([...sq, sq[0]]) - areaM2(sq)) < 1, 'open and closed rings agree');
  assert.ok(Math.abs(perimeterM(sq) - 400) < 2);
  assert.equal(areaM2(sq.slice(0, 2)), 0);
});

test('words a child understands', () => {
  assert.equal(distanceKid(23), 'about 46 kid steps');
  assert.equal(distanceWords(1500), '1.50 km');
  assert.equal(areaKid(24), 'about 2 bedrooms');
  assert.equal(areaKid(260), 'about 1 tennis court');
  assert.equal(areaKid(14_000), 'about 2 soccer fields');
  assert.equal(areaWords(25_000), '2.50 hectares');
});

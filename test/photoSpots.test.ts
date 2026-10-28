import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARROWS, WEDGE_FULL_ZOOM, WEDGE_MIN_SCALE, addShot, spotPinScale, wedgeScale, backAtSpotWords, lookingWords, nearestArrow, removeShot, repeatedSpots, shotDays, spotBearing, spotTitle, storedBearing, viewWedge } from '../src/photoSpots.ts';
import { distanceM } from '../src/geo.ts';
import type { PhotoSpot } from '../src/types.ts';

const spot = (shots: PhotoSpot['shots'], extra: Partial<PhotoSpot> = {}): PhotoSpot => ({ id: 's', createdAt: '2026-05-01T10:00:00Z', shots, ...extra });
const utcDay = (iso: string) => iso.slice(0, 10);

test('the eight arrows run clockwise from north, a word each', () => {
  assert.deepEqual(ARROWS.map(a => a.deg), [0, 45, 90, 135, 180, 225, 270, 315]);
  assert.equal(ARROWS[0].word, 'north');
  assert.equal(ARROWS[3].word, 'south-east');
});

test('a spot looks the way of its newest picture that has a way; none known is no wedge, never north', () => {
  assert.equal(spotBearing(spot([])), undefined);
  assert.equal(spotBearing(spot([{ id: 'a', takenAt: 'x' }])), undefined);
  assert.equal(spotBearing(spot([{ id: 'a', takenAt: 'x', bearing: 0 }])), 0, 'north is a real answer when chosen');
  assert.equal(spotBearing(spot([{ id: 'a', takenAt: 'x', bearing: 90 }, { id: 'b', takenAt: 'y' }])), 90);
  assert.equal(spotBearing(spot([{ id: 'a', takenAt: 'x', bearing: 90 }, { id: 'b', takenAt: 'y', bearing: 200 }])), 200);
});

test('a compass reading is stored as whole degrees 0–359, and lights its nearest arrow', () => {
  assert.equal(storedBearing(359.6), 0);
  assert.equal(storedBearing(-10), 350);
  assert.equal(storedBearing(721.2), 1);
  assert.equal(nearestArrow(22), 0);
  assert.equal(nearestArrow(23), 45);
  assert.equal(nearestArrow(350), 0);
  assert.equal(nearestArrow(-100), 270);
});

test('looking words say the way, or nothing when it is not known', () => {
  assert.equal(lookingWords(44), 'Looking north-east');
  assert.equal(lookingWords(undefined), null);
});

test('taking it again keeps every picture, oldest first; the last picture is never removed alone', () => {
  let s = spot([{ id: 'a', takenAt: '2026-05-01T10:00:00Z', bearing: 90 }]);
  s = addShot(s, { id: 'b', takenAt: '2026-10-01T10:00:00Z', bearing: 92 });
  assert.deepEqual(s.shots.map(x => x.id), ['a', 'b']);
  assert.equal(removeShot(s, 'a').shots.length, 1);
  assert.equal(removeShot(removeShot(s, 'a'), 'b').shots.length, 1, 'a spot keeps one picture: removing it is deleting the spot');
});

test('then and now counts spots taken on two different days, not twice in one afternoon', () => {
  const once = spot([{ id: 'a', takenAt: '2026-05-01T10:00:00Z' }, { id: 'b', takenAt: '2026-05-01T15:00:00Z' }]);
  const twice = spot([{ id: 'a', takenAt: '2026-05-01T10:00:00Z' }, { id: 'b', takenAt: '2026-10-03T10:00:00Z' }]);
  assert.equal(shotDays(once, utcDay), 1);
  assert.equal(shotDays(twice, utcDay), 2);
  assert.equal(repeatedSpots([once, twice, spot([])], utcDay), 1);
});

test('a spot is called by its name, or "Photo spot"', () => {
  assert.equal(spotTitle({ name: '  ' }), 'Photo spot');
  assert.equal(spotTitle({ name: 'The big pond' }), 'The big pond');
});

test('the exported wedge is Field Mapper\'s cone: apex at the spot, both edges the length away, pointing the way', () => {
  const [lon, lat] = [-63.57, 44.65];
  const ring = viewWedge(lon, lat, 90, 50, 15);
  assert.equal(ring.length, 4);
  assert.deepEqual(ring[0], [lon, lat]);
  assert.deepEqual(ring[3], [lon, lat]);
  for (const p of [ring[1], ring[2]]) assert.ok(Math.abs(distanceM(lat, lon, p[1], p[0]) - 15) < 0.01);
  // Looking east: both far corners are east of the spot, one either side of it.
  assert.ok(ring[1][0] > lon && ring[2][0] > lon);
  assert.ok(ring[1][1] > lat && ring[2][1] < lat);
});

test('coming back to a spot: here within the GPS wobble, else how far in round numbers', () => {
  assert.deepEqual(backAtSpotWords(5, 3), { here: true, text: 'You are at the spot!' });
  assert.equal(backAtSpotWords(12, 15).here, true);
  assert.equal(backAtSpotWords(42, 5).text, 'The spot is 40 metres away');
  assert.equal(backAtSpotWords(1260, 5).text, 'The spot is 1.3 kilometres away');
});

test('the wedge shrinks with the ground zoomed out, never grows past full size zoomed in, and hides when tiny', () => {
  assert.equal(wedgeScale(WEDGE_FULL_ZOOM), 1);
  assert.equal(wedgeScale(WEDGE_FULL_ZOOM + 3), 1, 'zoomed right in it stays readable, not screen-filling');
  assert.equal(wedgeScale(WEDGE_FULL_ZOOM - 1), 0.5, 'one zoom level out, half the size: as metres on the ground');
  assert.equal(wedgeScale(WEDGE_FULL_ZOOM - 2), 0.25);
  assert.ok(wedgeScale(14) < WEDGE_MIN_SCALE, 'a whole-park view draws no wedges');
  assert.ok(wedgeScale(16) >= WEDGE_MIN_SCALE);
});

test('the pin eases from full size at zoom 18 to 0.6 at zoom 14, and no smaller', () => {
  assert.equal(spotPinScale(20), 1);
  assert.equal(spotPinScale(18), 1);
  assert.equal(spotPinScale(17), 0.9);
  assert.equal(spotPinScale(16), 0.8);
  assert.equal(spotPinScale(14), 0.6);
  assert.equal(spotPinScale(5), 0.6);
});

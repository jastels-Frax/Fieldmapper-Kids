import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync, strFromU8 } from 'fflate';
import { buildExport, roughPlace } from '../src/exportData.ts';
import type { Find, FindMedia, PhotoSpot, Profile, Sketch, SpotMedia } from '../src/types.ts';
import type { Walk } from '../src/walk.ts';

const find: Find = { id: 'f1', profileId: 'p1', createdAt: '2026-10-28T10:00:00Z', category: 'bird', colours: [], pictures: [], lat: 44.651234, lon: -63.574321, accuracy: 4, placeBy: 'gps' };
const profile: Profile = { id: 'p1', name: 'Sam', avatar: '🦊', mode: 'explorer', guide: 'frog', createdAt: '2026-10-28T09:00:00Z' };
const walk: Walk = { id: 'w1', profileId: 'p1', startedAt: '2026-10-28T10:00:00Z', endedAt: '2026-10-28T10:30:00Z', points: [{ lon: -63.5743, lat: 44.6512, t: 1, acc: 5 }, { lon: -63.5741, lat: 44.6515, t: 2, acc: 5 }] };
const sketch: Sketch = { id: 's1', profileId: 'p1', createdAt: '2026-10-28T10:00:00Z', kind: 'line', points: [[-63.574321, 44.651234], [-63.573999, 44.651777]], colour: '#e8590c' };
const noMedia = async (): Promise<FindMedia> => ({ pictures: [], voices: [] });

const open = async (blob: Blob) => unzipSync(new Uint8Array(await blob.arrayBuffer()));

test('rough places round every find and drawing to about 100 m and leave paths out', async () => {
  const files = await open(await buildExport([find], [profile], [walk], noMedia, [sketch], { rough: true }));
  assert.ok(!('paths.geojson' in files));
  const fc = JSON.parse(strFromU8(files['finds.geojson']));
  assert.deepEqual(fc.features[0].geometry.coordinates, [-63.574, 44.651]);
  const csv = strFromU8(files['finds.csv']);
  assert.ok(csv.includes('44.651,') && !csv.includes('44.651234'));
  const drawings = JSON.parse(strFromU8(files['drawings.geojson']));
  assert.deepEqual(drawings.features[0].geometry.coordinates, [[-63.574, 44.651], [-63.574, 44.652]]);
  assert.match(strFromU8(files['README.txt']), /ROUGH/);
});

test('exact places keep the coordinates and the paths, and say so', async () => {
  const files = await open(await buildExport([find], [profile], [walk], noMedia, [sketch]));
  assert.ok('paths.geojson' in files);
  assert.deepEqual(JSON.parse(strFromU8(files['finds.geojson'])).features[0].geometry.coordinates, [-63.574321, 44.651234]);
  assert.match(strFromU8(files['README.txt']), /EXACT/);
});

test('roughPlace keeps three decimals', () => {
  assert.equal(roughPlace(44.651234), 44.651);
  assert.equal(roughPlace(-63.5745), -63.574);
});

const spot: PhotoSpot = {
  id: 'sp1', profileId: 'p1', createdAt: '2026-05-01T10:00:00Z', name: 'The pond', lat: 44.651234, lon: -63.574321, accuracy: 5, placeBy: 'gps',
  shots: [{ id: 'a', takenAt: '2026-05-01T10:00:00Z', bearing: 90, facingBy: 'compass' }, { id: 'b', takenAt: '2026-10-03T10:00:00Z' }],
};
const spotMedia = async (): Promise<SpotMedia> => ({ photos: [{ id: 'a', blob: new Blob([new Uint8Array([1, 2])], { type: 'image/jpeg' }) }, { id: 'b', blob: new Blob([new Uint8Array([3])], { type: 'image/jpeg' }) }] });

test('photo spots export as a point, a view wedge where the way is known, and every picture by date', async () => {
  const files = await open(await buildExport([], [profile], [], noMedia, [], { spots: { list: [spot], media: spotMedia } }));
  const fc = JSON.parse(strFromU8(files['photo-spots.geojson']));
  const point = fc.features.find((f: { properties: { part: string } }) => f.properties.part === 'spot');
  const view = fc.features.find((f: { properties: { part: string } }) => f.properties.part === 'view');
  assert.deepEqual(point.geometry.coordinates, [-63.574321, 44.651234]);
  assert.equal(point.properties.bearing_deg, 90, 'the newest picture with a way: the second has none');
  assert.equal(point.properties.bearings, '90;', 'a picture with no way stays blank, never 0');
  assert.equal(view.geometry.type, 'Polygon');
  assert.deepEqual(view.geometry.coordinates[0][0], [-63.574321, 44.651234]);
  assert.ok('photo-spots/001_2026-05-01_1.jpg' in files && 'photo-spots/001_2026-10-03_2.jpg' in files);
});

test('rough places round a photo spot too', async () => {
  const files = await open(await buildExport([], [profile], [], noMedia, [], { rough: true, spots: { list: [spot], media: spotMedia } }));
  const fc = JSON.parse(strFromU8(files['photo-spots.geojson']));
  assert.deepEqual(fc.features[0].geometry.coordinates, [-63.574, 44.651]);
  assert.deepEqual(fc.features[1].geometry.coordinates[0][0], [-63.574, 44.651]);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync, strFromU8 } from 'fflate';
import { buildExport, roughPlace } from '../src/exportData.ts';
import type { Find, FindMedia, Profile, Sketch } from '../src/types.ts';
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

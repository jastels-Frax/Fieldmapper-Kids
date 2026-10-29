import { zipSync, strToU8 } from 'fflate';
import type { Find, FindMedia, PhotoSpot, Profile, Sketch, SpotMedia } from './types.ts';
import { spotBearing, viewWedge } from './photoSpots.ts';
import { categoryOf, fullName, groupOf } from './categories.ts';
import { lovedBy } from './favourites.ts';
import { csvCell } from './csv.ts';
import { walkGeoJSON, type Walk } from './walk.ts';

function ext(b: Blob, fallback: string): string {
  const t = b.type;
  if (t.includes('jpeg')) return 'jpg';
  if (t.includes('png')) return 'png';
  if (t.includes('mp4') || t.includes('aac')) return 'm4a';
  if (t.includes('ogg')) return 'ogg';
  if (t.includes('webm')) return 'webm';
  return fallback;
}

/**
 * A place rounded to 3 decimals: about 110 m north–south and 80 m east–west in Nova Scotia. Enough to say which
 * park or trail; not which house or which tree a child stood under.
 */
export function roughPlace(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export interface ExportOptions {
  /**
   * Rough places: every find and drawing rounded (roughPlace) and recorded paths left out, since a path rounded is
   * still a line from somebody's door. For a file that will be shared; the grown-up corner offers it first.
   */
  rough?: boolean;
  /** Photo spots, with a reader for their pictures: `photo-spots.geojson` and `photo-spots/`. */
  spots?: { list: PhotoSpot[]; media: (id: string) => Promise<SpotMedia> };
}

/**
 * Every find as a zip: a GeoJSON a grown-up can open in a GIS, a CSV, and the
 * pictures and voices, named by find number. Each find carries its explorer's name.
 */
export async function buildExport(finds: Find[], profiles: Profile[], walks: Walk[], media: (id: string) => Promise<FindMedia>, sketches: Sketch[] = [], opts: ExportOptions = {}): Promise<Blob> {
  const place = (n: number) => (opts.rough ? roughPlace(n) : n);
  const placeText = (n: number | undefined) => (typeof n === 'number' ? (opts.rough ? roughPlace(n).toFixed(3) : n.toFixed(6)) : '');
  const files: Record<string, Uint8Array> = {};
  const features = [];
  const who = new Map(profiles.map(p => [p.id, p.name || 'Explorer'] as const));
  const rows = [['id', 'explorer', 'when', 'changed', 'group', 'kind', 'sign', 'species', 'species_own_name', 'scientific_name', 'habitat', 'habitat_own_name',
    'name', 'colours', 'size', 'count', 'latitude', 'longitude', 'accuracy_m', 'note', 'loved_by', 'pictures', 'voice']];
  for (const [i, f] of finds.slice().reverse().entries()) {
    const n = String(i + 1).padStart(3, '0');
    const kind = fullName(categoryOf(f.category)).toLowerCase().replace(/[^a-z]+/g, '-');
    const pictures: string[] = [];
    const m = await media(f.id);
    for (const [k, p] of m.pictures.entries()) {
      const path = `${p.kind === 'photo' ? 'photos' : 'drawings'}/${n}_${kind}_${k + 1}.${ext(p.blob, p.kind === 'photo' ? 'jpg' : 'png')}`;
      files[path] = new Uint8Array(await p.blob.arrayBuffer());
      pictures.push(path);
    }
    const voicePaths: string[] = [];
    for (const [k, v] of m.voices.entries()) {
      const path = `voices/${n}_${kind}${m.voices.length > 1 ? `_${k + 1}` : ''}.${ext(v, 'webm')}`;
      files[path] = new Uint8Array(await v.arrayBuffer());
      voicePaths.push(path);
    }
    const voice = voicePaths.join(';');
    const props = {
      id: f.id, explorer: (f.profileId && who.get(f.profileId)) || '', when: f.createdAt, changed: f.editedAt ?? '',
      group: groupOf(f.category)?.label ?? '', kind: fullName(categoryOf(f.category)), sign: f.sign ?? '', species: f.species?.name ?? '', species_own_name: !!f.species?.own, scientific_name: f.species?.scientific ?? '',
      habitat: f.habitat?.name ?? '', habitat_own_name: !!f.habitat?.own,
      name: f.nickname ?? '', colours: f.colours.join(';'), size: f.size ?? '', count: f.count ?? '',
      accuracy_m: f.accuracy ?? null, note: f.note ?? '',
      // Favourites are each explorer's own (favourites.ts): the explorers who love this find.
      loved_by: lovedBy(profiles, f.id).map(p => p.name || 'Explorer').join(';'), pictures: pictures.join(';'), voice,
    };
    features.push({
      type: 'Feature',
      geometry: typeof f.lat === 'number' && typeof f.lon === 'number' ? { type: 'Point', coordinates: [place(f.lon), place(f.lat)] } : null,
      properties: props,
    });
    rows.push([f.id, props.explorer, f.createdAt, props.changed, props.group, props.kind, props.sign, props.species, props.species_own_name ? 'yes' : '', props.scientific_name,
      props.habitat, props.habitat_own_name ? 'yes' : '', props.name,
      props.colours, props.size, props.count, placeText(f.lat), placeText(f.lon), String(f.accuracy ?? ''),
      props.note, props.loved_by, props.pictures, voice]);
  }
  files['finds.geojson'] = strToU8(JSON.stringify({ type: 'FeatureCollection', features }, null, 1));
  if (walks.length && !opts.rough) {
    files['paths.geojson'] = strToU8(JSON.stringify({
      type: 'FeatureCollection',
      features: walks.filter(w => w.points.length >= 2).map(w => walkGeoJSON(w, (w.profileId && who.get(w.profileId)) || '')),
    }));
  }
  if (sketches.length) {
    files['drawings.geojson'] = strToU8(JSON.stringify({
      type: 'FeatureCollection',
      features: sketches.filter(s => s.points.length >= 2).map(s => ({
        type: 'Feature',
        geometry: s.kind === 'area' && s.points.length > 2
          ? { type: 'Polygon', coordinates: [[...s.points, s.points[0]].map(([x, y]) => [place(x), place(y)])] }
          : { type: 'LineString', coordinates: s.points.map(([x, y]) => [place(x), place(y)]) },
        properties: { id: s.id, explorer: (s.profileId && who.get(s.profileId)) || '', when: s.createdAt, kind: s.kind, colour: s.colour, name: s.name ?? '' },
      })),
    }));
  }
  const spotList = opts.spots?.list ?? [];
  if (spotList.length) {
    // Field Mapper's photo point export: a point per spot with its camera bearing, plus the view cone a GIS can draw
    // (15 m, 50°, as Field Mapper's default) where the way is known. Every picture, named by spot and date.
    const spotFeatures = [];
    for (const [i, s] of spotList.slice().reverse().entries()) {
      const n = String(i + 1).padStart(3, '0');
      const m = await opts.spots!.media(s.id);
      const pictures: string[] = [];
      for (const [k, shot] of s.shots.entries()) {
        const p = m.photos.find(x => x.id === shot.id);
        if (!p) continue;
        const path = `photo-spots/${n}_${shot.takenAt.slice(0, 10)}_${k + 1}.${ext(p.blob, 'jpg')}`;
        files[path] = new Uint8Array(await p.blob.arrayBuffer());
        pictures.push(path);
      }
      const props = {
        id: s.id, explorer: (s.profileId && who.get(s.profileId)) || '', when: s.createdAt, name: s.name ?? '',
        bearing_deg: spotBearing(s) ?? null, accuracy_m: s.accuracy ?? null, placed_by: s.placeBy ?? '',
        pictures: pictures.join(';'),
        taken: s.shots.map(x => x.takenAt).join(';'),
        bearings: s.shots.map(x => (typeof x.bearing === 'number' ? String(x.bearing) : '')).join(';'),
      };
      const located = typeof s.lat === 'number' && typeof s.lon === 'number';
      spotFeatures.push({ type: 'Feature', geometry: located ? { type: 'Point', coordinates: [place(s.lon!), place(s.lat!)] } : null, properties: { ...props, part: 'spot' } });
      const b = spotBearing(s);
      if (located && typeof b === 'number') {
        spotFeatures.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [viewWedge(place(s.lon!), place(s.lat!), b)] }, properties: { id: s.id, part: 'view', bearing_deg: b } });
      }
    }
    files['photo-spots.geojson'] = strToU8(JSON.stringify({ type: 'FeatureCollection', features: spotFeatures }, null, 1));
  }
  files['finds.csv'] = strToU8(rows.map(r => r.map(csvCell).join(',')).join('\r\n'));
  files['README.txt'] = strToU8(
    `Scout - finds by ${profiles.map(p => p.name || 'Explorer').join(', ') || 'Explorer'}\n` +
    `Exported ${new Date().toISOString()}\n` +
    (opts.rough ? `Places are ROUGH: rounded to about 100 m, and recorded paths are left out.\n\n` : `Places are EXACT, and recorded paths are included. Share this file with care.\n\n`) +
    `finds.geojson  every find as a point (WGS 84 longitude/latitude); finds with no location have no geometry\n` +
    `finds.csv      the same, as a table\n` +
    `paths.geojson  recorded paths as lines, with a time for every point\n` +
    `drawings.geojson  lines and shapes drawn on the map with the Draw tool\n` +
    `photo-spots.geojson  photo spots: a point where the explorer stood (part=spot) and, where the way is known, a 15 m view wedge (part=view); bearings in degrees from north\n` +
    `photo-spots/   every picture taken at a photo spot, named by spot and date\n` +
    `photos/, drawings/, voices/  the pictures and recordings, named as in the table\n` +
    `species        names chosen from ACCDC species lists (via Fraxinus Field Mapper) or a list a grown-up imported\n`,
  );
  // Pictures and sound are already compressed; storing them is faster and no bigger.
  const zipped = zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, [v, { level: /\.(geojson|csv|txt)$/.test(k) ? 6 : 0 }]])));
  return new Blob([zipped], { type: 'application/zip' });
}

export async function saveFile(blob: Blob, name: string): Promise<void> {
  const file = new File([blob], name, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch { /* cancelled or refused: fall back to a download */ }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

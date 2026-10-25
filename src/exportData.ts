import { zipSync, strToU8 } from 'fflate';
import type { Find, FindMedia, Profile, Sketch } from './types.ts';
import { categoryOf } from './categories.ts';
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
 * Every find as a zip: a GeoJSON a grown-up can open in a GIS, a CSV, and the
 * pictures and voices, named by find number. Each find carries its explorer's name.
 */
export async function buildExport(finds: Find[], profiles: Profile[], walks: Walk[], media: (id: string) => Promise<FindMedia>, sketches: Sketch[] = []): Promise<Blob> {
  const files: Record<string, Uint8Array> = {};
  const features = [];
  const who = new Map(profiles.map(p => [p.id, p.name || 'Explorer'] as const));
  const rows = [['id', 'explorer', 'when', 'changed', 'kind', 'sign', 'species', 'species_own_name', 'scientific_name', 'name', 'colours', 'size', 'count',
    'latitude', 'longitude', 'accuracy_m', 'note', 'pictures', 'voice']];
  for (const [i, f] of finds.slice().reverse().entries()) {
    const n = String(i + 1).padStart(3, '0');
    const kind = categoryOf(f.category).label.toLowerCase().replace(/[^a-z]+/g, '-');
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
      kind: categoryOf(f.category).label, sign: f.sign ?? '', species: f.species?.name ?? '', species_own_name: !!f.species?.own, scientific_name: f.species?.scientific ?? '',
      name: f.nickname ?? '', colours: f.colours.join(';'), size: f.size ?? '', count: f.count ?? '',
      accuracy_m: f.accuracy ?? null, note: f.note ?? '', favourite: !!f.favourite, pictures: pictures.join(';'), voice,
    };
    features.push({
      type: 'Feature',
      geometry: typeof f.lat === 'number' && typeof f.lon === 'number' ? { type: 'Point', coordinates: [f.lon, f.lat] } : null,
      properties: props,
    });
    rows.push([f.id, props.explorer, f.createdAt, props.changed, props.kind, props.sign, props.species, props.species_own_name ? 'yes' : '', props.scientific_name, props.name,
      props.colours, props.size, props.count, f.lat?.toFixed(6) ?? '', f.lon?.toFixed(6) ?? '', String(f.accuracy ?? ''),
      props.note, props.pictures, voice]);
  }
  files['finds.geojson'] = strToU8(JSON.stringify({ type: 'FeatureCollection', features }, null, 1));
  if (walks.length) {
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
          ? { type: 'Polygon', coordinates: [[...s.points, s.points[0]]] }
          : { type: 'LineString', coordinates: s.points },
        properties: { id: s.id, explorer: (s.profileId && who.get(s.profileId)) || '', when: s.createdAt, kind: s.kind, colour: s.colour, name: s.name ?? '' },
      })),
    }));
  }
  files['finds.csv'] = strToU8(rows.map(r => r.map(csvCell).join(',')).join('\r\n'));
  files['README.txt'] = strToU8(
    `Scout - finds by ${profiles.map(p => p.name || 'Explorer').join(', ') || 'Explorer'}\n` +
    `Exported ${new Date().toISOString()}\n\n` +
    `finds.geojson  every find as a point (WGS 84 longitude/latitude); finds with no location have no geometry\n` +
    `finds.csv      the same, as a table\n` +
    `paths.geojson  recorded paths as lines, with a time for every point\n` +
    `drawings.geojson  lines and shapes drawn on the map with the Draw tool\n` +
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

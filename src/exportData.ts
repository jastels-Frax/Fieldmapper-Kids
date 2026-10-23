import { zipSync, strToU8 } from 'fflate';
import type { Find } from './types.ts';
import { categoryOf } from './categories.ts';
import { csvCell } from './csv.ts';

function ext(b: Blob, fallback: string): string {
  const t = b.type;
  if (t.includes('jpeg')) return 'jpg';
  if (t.includes('png')) return 'png';
  if (t.includes('mp4') || t.includes('aac')) return 'm4a';
  if (t.includes('ogg')) return 'ogg';
  if (t.includes('webm')) return 'webm';
  return fallback;
}

/** Every find as a zip: a GeoJSON a grown-up can open in a GIS, plus the pictures and voices. */
export async function buildExport(finds: Find[], explorer: string): Promise<Blob> {
  const files: Record<string, Uint8Array> = {};
  const features = [];
  const rows = [['id', 'when', 'kind', 'name', 'colours', 'size', 'count', 'latitude', 'longitude', 'accuracy_m', 'note', 'photo', 'drawing', 'voice']];
  for (const [i, f] of finds.slice().reverse().entries()) {
    const n = String(i + 1).padStart(3, '0');
    const kind = categoryOf(f.category).label.toLowerCase();
    const photo = f.photo ? `photos/${n}_${kind}.${ext(f.photo, 'jpg')}` : '';
    const drawing = f.drawing ? `drawings/${n}_${kind}.${ext(f.drawing, 'png')}` : '';
    const voice = f.voice ? `voices/${n}_${kind}.${ext(f.voice, 'webm')}` : '';
    if (f.photo) files[photo] = new Uint8Array(await f.photo.arrayBuffer());
    if (f.drawing) files[drawing] = new Uint8Array(await f.drawing.arrayBuffer());
    if (f.voice) files[voice] = new Uint8Array(await f.voice.arrayBuffer());
    const props = {
      id: f.id, when: f.createdAt, kind, name: f.nickname ?? '', colours: f.colours.join(';'),
      size: f.size ?? '', count: f.count ?? '', accuracy_m: f.accuracy ?? null, note: f.note ?? '',
      favourite: !!f.favourite, photo, drawing, voice,
    };
    features.push({
      type: 'Feature',
      geometry: typeof f.lat === 'number' && typeof f.lon === 'number' ? { type: 'Point', coordinates: [f.lon, f.lat] } : null,
      properties: props,
    });
    rows.push([f.id, f.createdAt, kind, props.name, props.colours, props.size, props.count,
      f.lat?.toFixed(6) ?? '', f.lon?.toFixed(6) ?? '', String(f.accuracy ?? ''), props.note, photo, drawing, voice]);
  }
  files['finds.geojson'] = strToU8(JSON.stringify({ type: 'FeatureCollection', features }, null, 1));
  files['finds.csv'] = strToU8(rows.map(r => r.map(csvCell).join(',')).join('\r\n'));
  files['README.txt'] = strToU8(
    `Scout - ${explorer || 'Explorer'}'s finds\n` +
    `Exported ${new Date().toISOString()}\n\n` +
    `finds.geojson  every find as a point (WGS 84 longitude/latitude); finds with no location have no geometry\n` +
    `finds.csv      the same, as a table\n` +
    `photos/, drawings/, voices/  the pictures and recordings, named as in the table\n`,
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

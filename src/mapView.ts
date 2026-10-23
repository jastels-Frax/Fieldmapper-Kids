import maplibregl, { type Map as MlMap, type Marker, type StyleSpecification } from 'maplibre-gl';
import type { Find } from './types.ts';
import { categoryOf } from './categories.ts';
import type { Fix } from './gps.ts';
import { blobUrl } from './ui.ts';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** What the map draws with no network and nothing cached: grass. Finds still show. */
const OFFLINE_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#d3f9d8' } }],
};

async function pickStyle(): Promise<string | StyleSpecification> {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 6000);
    const res = await fetch(STYLE_URL, { signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as StyleSpecification;
  } catch {
    return OFFLINE_STYLE;
  }
}

export class MapView {
  map!: MlMap;
  private me: Marker | null = null;
  private meRing: HTMLElement | null = null;
  private findMarkers = new Map<string, Marker>();
  private followed = false;
  onFindTap: (id: string) => void = () => {};
  offline = false;

  async mount(container: HTMLElement, avatar: string): Promise<void> {
    const style = await pickStyle();
    this.offline = style === OFFLINE_STYLE;
    this.map = new maplibregl.Map({
      container,
      style,
      center: [-63.57, 44.65],
      zoom: 3,
      attributionControl: { compact: true },
      pitchWithRotate: false,
      dragRotate: false,
    });
    this.map.touchZoomRotate.disableRotation();
    this.setAvatar(avatar);
    await new Promise<void>(r => (this.map.loaded() ? r() : this.map.once('load', () => r())));
    this.map.addSource('trail', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    this.map.addLayer({
      id: 'trail-line', type: 'line', source: 'trail',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#f76707', 'line-width': 6, 'line-dasharray': [0.1, 2], 'line-opacity': 0.9 },
    });
  }

  setAvatar(avatar: string): void {
    if (!this.me) {
      const el = document.createElement('div');
      el.className = 'me-marker';
      this.meRing = document.createElement('div');
      this.meRing.className = 'me-ring';
      el.append(this.meRing, Object.assign(document.createElement('span'), { className: 'me-face' }));
      this.me = new maplibregl.Marker({ element: el });
    }
    (this.me.getElement().querySelector('.me-face') as HTMLElement).textContent = avatar;
  }

  showMe(fix: Fix): void {
    if (!this.me) return;
    this.me.setLngLat([fix.lon, fix.lat]);
    if (!this.me.getElement().isConnected) this.me.addTo(this.map);
    if (!this.followed) {
      this.followed = true;
      this.map.jumpTo({ center: [fix.lon, fix.lat], zoom: 17 });
    }
  }

  goToMe(fix: Fix | null): boolean {
    if (!fix) return false;
    this.map.flyTo({ center: [fix.lon, fix.lat], zoom: Math.max(this.map.getZoom(), 17) });
    return true;
  }

  flyTo(lat: number, lon: number): void {
    this.map.flyTo({ center: [lon, lat], zoom: 18 });
  }

  setFinds(finds: Find[]): void {
    const seen = new Set<string>();
    for (const f of finds) {
      if (typeof f.lat !== 'number' || typeof f.lon !== 'number') continue;
      seen.add(f.id);
      if (this.findMarkers.has(f.id)) continue;
      const cat = categoryOf(f.category);
      const el = document.createElement('button');
      el.className = 'find-marker';
      el.style.setProperty('--cat', cat.colour);
      el.setAttribute('aria-label', f.nickname || cat.label);
      if (f.thumb) {
        const img = document.createElement('img');
        img.alt = '';
        el.append(img);
        el.classList.add('has-photo');
        // The marker is attached below in this same task, so its URL survives.
        queueMicrotask(() => { img.src = blobUrl(f.thumb!, el); });
      }
      const badge = document.createElement('span');
      badge.className = 'find-marker-emoji';
      badge.textContent = cat.emoji;
      el.append(badge);
      el.addEventListener('click', e => {
        e.stopPropagation();
        this.onFindTap(f.id);
      });
      this.findMarkers.set(f.id, new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([f.lon, f.lat]).addTo(this.map));
    }
    for (const [id, m] of this.findMarkers) {
      if (!seen.has(id)) {
        m.remove();
        this.findMarkers.delete(id);
      }
    }
  }

  /** Forget every marker, so the next setFinds redraws edited finds. */
  clearFinds(): void {
    this.findMarkers.forEach(m => m.remove());
    this.findMarkers.clear();
  }

  setTrail(points: [number, number, number][], visible: boolean): void {
    const src = this.map.getSource('trail') as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData({
      type: 'FeatureCollection',
      features: visible && points.length > 1
        ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points.map(p => [p[0], p[1]]) } }]
        : [],
    });
  }
}

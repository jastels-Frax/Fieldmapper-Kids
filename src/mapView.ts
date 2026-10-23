import maplibregl, { type Map as MlMap, type Marker, type StyleSpecification } from 'maplibre-gl';
import type { Basemap, Find } from './types.ts';
import { categoryOf } from './categories.ts';
import type { Fix } from './gps.ts';
import { blobUrl } from './ui.ts';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
/** Esri World Imagery. Capped at z18: finer requests can fail, and MapLibre overzooms the last level. */
const IMAGERY_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
/** Layers this app adds; a basemap switch never touches them. */
const OWN_LAYERS = new Set(['sat', 'trail-line']);

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

  private baseVisibility = new Map<string, 'visible' | 'none'>();

  async mount(container: HTMLElement, avatar: Face, basemap: Basemap): Promise<void> {
    const style = await pickStyle();
    this.offline = style === OFFLINE_STYLE;
    const withImagery = withImageryLayer(style);
    this.map = new maplibregl.Map({
      container,
      style: withImagery,
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
    for (const l of this.map.getStyle().layers ?? []) {
      if (OWN_LAYERS.has(l.id)) continue;
      this.baseVisibility.set(l.id, ((l.layout as { visibility?: 'visible' | 'none' } | undefined)?.visibility) ?? 'visible');
    }
    this.setBasemap(basemap);
  }

  /**
   * Streets is the vector map as it comes. Satellite hides all of it over the
   * imagery. Hybrid keeps the roads, paths, borders and every label on top of
   * the imagery and hides the filled areas that would cover it.
   */
  setBasemap(mode: Basemap): void {
    if (!this.map?.getLayer('sat')) return;
    this.map.setLayoutProperty('sat', 'visibility', mode === 'streets' ? 'none' : 'visible');
    for (const l of this.map.getStyle().layers ?? []) {
      if (OWN_LAYERS.has(l.id)) continue;
      const original = this.baseVisibility.get(l.id) ?? 'visible';
      let vis: 'visible' | 'none';
      if (mode === 'streets') vis = original;
      else if (mode === 'satellite') vis = 'none';
      else vis = original === 'visible' && keptInHybrid(l) ? 'visible' : 'none';
      this.map.setLayoutProperty(l.id, 'visibility', vis);
    }
  }

  setAvatar(face: Face): void {
    if (!this.me) {
      const el = document.createElement('div');
      el.className = 'me-marker';
      this.meRing = document.createElement('div');
      this.meRing.className = 'me-ring';
      el.append(this.meRing, Object.assign(document.createElement('span'), { className: 'me-face' }));
      this.me = new maplibregl.Marker({ element: el });
    }
    const slot = this.me.getElement().querySelector('.me-face') as HTMLElement;
    slot.replaceChildren();
    if (face.photo) {
      const img = document.createElement('img');
      img.alt = '';
      img.className = 'me-photo';
      if (this.mePhotoUrl) URL.revokeObjectURL(this.mePhotoUrl);
      this.mePhotoUrl = URL.createObjectURL(face.photo);
      img.src = this.mePhotoUrl;
      slot.append(img);
    } else {
      slot.textContent = face.emoji;
    }
  }

  private mePhotoUrl: string | null = null;

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

export interface Face {
  emoji: string;
  photo?: Blob;
}

/** Adds the imagery as a raster layer just above the style's own background. */
function withImageryLayer(style: string | StyleSpecification): StyleSpecification {
  const s = typeof style === 'string' ? OFFLINE_STYLE : style;
  const layers = [...(s.layers ?? [])];
  const at = layers.findIndex(l => l.type !== 'background');
  const sat = { id: 'sat', type: 'raster' as const, source: 'esri-imagery', layout: { visibility: 'none' as const } };
  layers.splice(at < 0 ? layers.length : at, 0, sat);
  return {
    ...s,
    sources: {
      ...s.sources,
      'esri-imagery': {
        type: 'raster', tiles: [IMAGERY_URL], tileSize: 256, maxzoom: 18,
        attribution: 'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      },
    },
    layers,
  };
}

/** In hybrid: lines that are roads, paths or borders, and every label and icon. */
function keptInHybrid(l: { id: string; type: string }): boolean {
  if (l.type === 'symbol') return true;
  if (l.type === 'line') return /road|highway|street|path|track|bridge|tunnel|rail|boundary|admin|ferry/i.test(l.id);
  return false;
}

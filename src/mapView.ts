import maplibregl, { type Map as MlMap, type Marker, type StyleSpecification } from 'maplibre-gl';
import type { Basemap, Find } from './types.ts';
import { categoryOf } from './categories.ts';
import type { Fix } from './gps.ts';
import { blobUrl } from './ui.ts';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
/** Esri World Imagery. Capped at z18: finer requests can fail, and MapLibre overzooms the last level. */
const IMAGERY_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
/** Layers this app adds; a basemap switch never touches them. */
const OWN_LAYERS = new Set(['sat', 'trail-line', 'walks-line', 'live-walk-line']);

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

/**
 * The facing arrow: Field Mapper's chevron (MapManager.orientationArrowSvg), bigger and with a soft
 * wedge behind it, drawn in the explorer's accent (currentColor). Centred on (80,80), pointing north at 0°.
 * Our own constant markup, the one kind of innerHTML this app allows.
 */
const FACING_SVG = `<svg viewBox="0 0 160 160" width="168" height="168" aria-hidden="true">
  <path d="M80 80 L46 16 A72 72 0 0 1 114 16 Z" fill="currentColor" fill-opacity="0.22"/>
  <path d="M80 2 L100 40 L80 31 L60 40 Z" fill="currentColor" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
</svg>`;

export class MapView {
  map!: MlMap;
  private me: Marker | null = null;
  private meRing: HTMLElement | null = null;
  private findMarkers = new Map<string, Marker>();
  private followed = false;
  onFindTap: (id: string) => void = () => {};
  /** A press and hold on the map (or a right-click): where it was. */
  onLongPress: (at: { lat: number; lon: number }) => void = () => {};
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
    this.bindLongPress();
    this.setAvatar(avatar);
    await new Promise<void>(r => (this.map.loaded() ? r() : this.map.once('load', () => r())));
    this.map.addSource('trail', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    this.map.addLayer({
      id: 'trail-line', type: 'line', source: 'trail',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#f76707', 'line-width': 6, 'line-dasharray': [0.1, 2], 'line-opacity': 0.9 },
    });
    this.map.addSource('walks', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    this.map.addLayer({
      id: 'walks-line', type: 'line', source: 'walks',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#7048e8', 'line-width': 5, 'line-opacity': 0.75 },
    });
    this.map.addSource('live-walk', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    this.map.addLayer({
      id: 'live-walk-line', type: 'line', source: 'live-walk',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#e8590c', 'line-width': 7, 'line-opacity': 0.95 },
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

  /**
   * Press and hold → onLongPress, copied from Field Mapper's MapManager.bindLongPress: rolled by hand because
   * mobile browsers fire their own long-press `contextmenu` inconsistently and with their callout UI, and
   * MapLibre's `contextmenu` is mouse-only (kept here too, for a right-click). Abandoned on real movement
   * (a pan starts as a touch that sits still a moment) and on a second finger (so does a pinch), and never
   * started on a pin, which has its own tap. A ring fills under the finger while it is held, so a child can
   * see the press is working.
   */
  private bindLongPress(): void {
    const box = this.map.getCanvasContainer();
    const HOLD_MS = 550;
    const SLOP_PX = 12;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let startX = 0, startY = 0;
    const ring = document.createElement('div');
    ring.className = 'press-ring';
    const cancel = () => {
      if (timer) { clearTimeout(timer); timer = null; }
      ring.remove();
    };
    const fire = (x: number, y: number) => {
      const r = this.map.getContainer().getBoundingClientRect();
      const ll = this.map.unproject([x - r.left, y - r.top]);
      this.onLongPress({ lat: ll.lat, lon: ll.lng });
    };
    box.addEventListener('touchstart', (e: TouchEvent) => {
      cancel();
      if (e.touches.length !== 1 || (e.target as Element).closest?.('.maplibregl-marker')) return;
      const t = e.touches[0];
      startX = t.clientX; startY = t.clientY;
      const r = this.map.getContainer().getBoundingClientRect();
      ring.style.left = `${startX - r.left}px`;
      ring.style.top = `${startY - r.top}px`;
      this.map.getContainer().append(ring);
      timer = setTimeout(() => {
        timer = null;
        ring.remove();
        navigator.vibrate?.(30);
        fire(startX, startY);
      }, HOLD_MS);
    }, { passive: true });
    box.addEventListener('touchmove', (e: TouchEvent) => {
      if (!timer) return;
      const t = e.touches[0];
      if (!t || e.touches.length > 1 || Math.hypot(t.clientX - startX, t.clientY - startY) > SLOP_PX) cancel();
    }, { passive: true });
    box.addEventListener('touchend', cancel, { passive: true });
    box.addEventListener('touchcancel', cancel, { passive: true });
    this.map.on('contextmenu', e => {
      if ((e.originalEvent.target as Element)?.closest?.('.maplibregl-marker')) return;
      e.preventDefault();
      this.onLongPress({ lat: e.lngLat.lat, lon: e.lngLat.lng });
    });
  }

  setAvatar(face: Face): void {
    if (!this.me) {
      // MapLibre positions the marker element itself (absolute + transform), so
      // nothing may restyle it: all the drawing happens on an inner element.
      const el = document.createElement('div');
      el.className = 'me-marker';
      const inner = document.createElement('div');
      inner.className = 'me-inner';
      this.meRing = document.createElement('div');
      this.meRing.className = 'me-ring';
      inner.append(this.meRing, Object.assign(document.createElement('span'), { className: 'me-face' }));
      el.append(inner);
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
  private facing: maplibregl.Marker | null = null;
  private facingDeg: number | null = null;
  private meAt: [number, number] | null = null;

  /**
   * The arrow showing which way the explorer faces, or null to take it away.
   * Its own marker, centred on the explorer and aligned to the MAP (Field
   * Mapper's orientation marker), so it keeps pointing at the real direction
   * when the map turns. Added only once there is a fix: a marker cannot be put
   * on the map before it has somewhere to be.
   */
  setFacing(deg: number | null): void {
    this.facingDeg = deg;
    if (deg == null) {
      this.facing?.remove();
      this.facing = null;
      return;
    }
    if (!this.facing && this.meAt) {
      const el = document.createElement('div');
      el.className = 'facing-marker';
      el.innerHTML = FACING_SVG;
      this.facing = new maplibregl.Marker({ element: el, anchor: 'center', rotationAlignment: 'map', pitchAlignment: 'map' })
        .setLngLat(this.meAt).addTo(this.map);
    }
    this.facing?.setRotation(deg);
  }

  showMe(fix: Fix): void {
    if (!this.me) return;
    this.me.setLngLat([fix.lon, fix.lat]);
    this.meAt = [fix.lon, fix.lat];
    if (this.facing) this.facing.setLngLat(this.meAt);
    else if (this.facingDeg != null) this.setFacing(this.facingDeg);
    if (!this.me.getElement().isConnected) this.me.addTo(this.map);
    if (!this.followed) {
      this.followed = true;
      this.map.jumpTo({ center: [fix.lon, fix.lat], zoom: 17 });
    }
  }

  /** As Field Mapper's #btn-locate (App.ts → MapManager.flyTo): the last fix, an 800 ms flight. */
  goToMe(fix: Fix | null): boolean {
    if (!fix) return false;
    this.map.flyTo({ center: [fix.lon, fix.lat], zoom: Math.max(this.map.getZoom(), 17), duration: 800 });
    return true;
  }

  /** Re-centres on the explorer at the current zoom: Field Mapper's follow (`MapManager.flyTo` on each fix). */
  follow(fix: Fix): void {
    this.map.flyTo({ center: [fix.lon, fix.lat], zoom: this.map.getZoom(), duration: 800 });
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
      // The button is the element MapLibre positions; the pin is drawn inside it.
      const el = document.createElement('button');
      el.className = 'find-marker';
      el.style.setProperty('--cat', cat.colour);
      el.setAttribute('aria-label', f.nickname || f.species?.name || cat.label);
      const pin = document.createElement('span');
      pin.className = 'find-pin';
      const face = document.createElement('span');
      face.className = 'find-pin-face';
      pin.append(face);
      if (f.thumb) {
        const img = document.createElement('img');
        img.alt = '';
        face.append(img);
        el.classList.add('has-photo');
        // The marker is attached below in this same task, so its URL survives.
        queueMicrotask(() => { img.src = blobUrl(f.thumb!, el); });
      }
      const badge = document.createElement('span');
      badge.className = 'find-marker-emoji';
      badge.textContent = cat.emoji;
      (f.thumb ? el : face).append(badge);
      el.prepend(pin);
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

  /** Saved paths (purple) and the one recording now (orange). */
  setWalks(lines: [number, number][][], live: [number, number][] | null): void {
    const fc = (ls: [number, number][][]) => ({
      type: 'FeatureCollection' as const,
      features: ls.filter(l => l.length > 1).map(coordinates => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates } })),
    });
    (this.map?.getSource('walks') as maplibregl.GeoJSONSource | undefined)?.setData(fc(lines));
    (this.map?.getSource('live-walk') as maplibregl.GeoJSONSource | undefined)?.setData(fc(live ? [live] : []));
  }

  fitLine(coords: [number, number][]): void {
    if (coords.length < 2) return;
    const b = new maplibregl.LngLatBounds(coords[0], coords[0]);
    for (const c of coords) b.extend(c);
    this.map.fitBounds(b, { padding: 80, maxZoom: 18 });
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

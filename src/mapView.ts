import { segmentsAtGaps } from './walk.ts';
import * as maplibregl from 'maplibre-gl';
import type { Map as MlMap, Marker, StyleSpecification } from 'maplibre-gl';
// MapLibre 6 looks for its worker beside its own file, which no longer exists once the app is bundled: give it the
// worker file Vite emits (a same-origin module, which the page's Content-Security-Policy allows).
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
maplibregl.setWorkerUrl(workerUrl);
import type { Basemap, Find, PhotoSpot, Sketch } from './types.ts';
import { WEDGE_FULL_ZOOM, WEDGE_MIN_SCALE, newestShot, spotBearing, spotPinScale, spotTitle, wedgeScale } from './photoSpots.ts';
import { categoryOf } from './categories.ts';
import type { Fix } from './gps.ts';
import { blobUrl } from './ui.ts';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
/** Esri World Imagery. Capped at z18: finer requests can fail, and MapLibre overzooms the last level. */
const IMAGERY_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
/** Layers this app adds; a basemap switch never touches them. */
const OWN_LAYERS = new Set(['sat', 'trail-line', 'walks-line', 'live-walk-line', 'picked-halo', 'sketch-fill', 'sketch-line', 'draft-fill', 'draft-line', 'draft-pts']);

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

/**
 * A photo spot's view wedge: Field Mapper's photo-point cone (`buildPhotoPointCone`, its default orange #f97316 at
 * 0.35 with a white edge). Apex at (150,150), pointing north at 0°, 60° wide, 140 px long at full size. It is scaled
 * with the map (`wedgeScale`, through `--spot-scale`): shrinking with the ground as Field Mapper's metre-sized cone
 * does when zoomed out, but never growing past full size zoomed in, where a cone in metres would cover the screen.
 * Only the wedge itself takes a tap (it is the big half of what a spot looks like, as Field Mapper's cone carries
 * its photo's id for the same reason). Our own constant markup.
 */
const SPOT_COLOUR = '#f97316';
const SPOT_CONE_SVG = `<svg viewBox="0 0 300 300" width="300" height="300" aria-hidden="true">
  <path d="M150 150 L80 28.8 A140 140 0 0 1 220 28.8 Z" fill="${SPOT_COLOUR}" fill-opacity="0.38" stroke="#ffffff" stroke-opacity="0.85" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
</svg>`;

export class MapView {
  map!: MlMap;
  private me: Marker | null = null;
  private meRing: HTMLElement | null = null;
  private findMarkers = new Map<string, Marker>();
  private spotMarkers = new Map<string, { key: string; pin: Marker; cone: Marker | null }>();
  private spotDraft: { pin: Marker; cone: Marker } | null = null;
  private followed = false;
  onFindTap: (id: string) => void = () => {};
  /** A tap on a photo spot's pin or its wedge. */
  onSpotTap: (id: string) => void = () => {};
  /** A press and hold on the map (or a right-click): where it was. */
  onLongPress: (at: { lat: number; lon: number }) => void = () => {};
  /** The explorer dragged the map (never fired by the app's own camera moves). */
  onUserPan: () => void = () => {};
  /** A tap on the map while a drawing tool is on (the ✏️ Draw and 📏 Measure tools). Null when none is. */
  onToolTap: ((at: { lat: number; lon: number }) => void) | null = null;
  /** A tap on the map itself (not a pin) while no tool is on: what is there (App.tapShape). */
  onMapTap: (at: { lat: number; lon: number }) => void = () => {};
  /**
   * While a drawing is being drawn or changed: a dot dragged to a new place (its index in the drawing's points).
   * Field Mapper's GeometryEditor drags vertices the same way. Null when nothing is being drawn.
   */
  onDraftDrag: ((i: number, at: { lat: number; lon: number }) => void) | null = null;
  /** The click a drag ends with must not also add a point there. */
  private suppressClickUntil = 0;
  private dragIndex = -1;
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
    this.map.on('click', e => {
      if (Date.now() < this.suppressClickUntil) return;
      const at = { lat: e.lngLat.lat, lon: e.lngLat.lng };
      // A drawing tool takes every tap, even one landing on the explorer's own marker (the pins step aside then).
      if (this.onToolTap) { this.onToolTap(at); return; }
      // A pin is a marker with its own tap (onFindTap); the map underneath must not answer it too.
      if ((e.originalEvent?.target as Element | null)?.closest?.('.maplibregl-marker')) return;
      this.onMapTap(at);
    });
    this.bindDraftDrag();
    // Photo spot wedges and pins follow the zoom (photoSpots.wedgeScale / spotPinScale), set once per frame as CSS
    // variables on the map, which every spot marker reads.
    const scaleSpots = () => {
      const z = this.map.getZoom();
      const el = this.map.getContainer();
      const w = wedgeScale(z);
      el.style.setProperty('--spot-scale', String(w));
      el.style.setProperty('--spot-pin-scale', String(spotPinScale(z)));
      el.classList.toggle('spots-far', w < WEDGE_MIN_SCALE);
    };
    this.map.on('zoom', scaleSpots);
    scaleSpots();
    this.map.on('dragstart', e => { if ((e as { originalEvent?: Event }).originalEvent) this.onUserPan(); });
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
    // The drawing or path whose card is open: a pale halo under it, so the explorer sees which one they tapped.
    this.map.addSource('picked', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    this.map.addLayer({ id: 'picked-halo', type: 'line', source: 'picked', layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': 15, 'line-opacity': 0.9, 'line-blur': 1 } }, 'walks-line');
    // Drawings (saved sketches) and the shape being drawn or measured right now.
    this.map.addSource('sketches', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    this.map.addLayer({ id: 'sketch-fill', type: 'fill', source: 'sketches', filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': ['get', 'colour'], 'fill-opacity': 0.25 } });
    this.map.addLayer({ id: 'sketch-line', type: 'line', source: 'sketches', layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': ['get', 'colour'], 'line-width': 5 } });
    this.map.addSource('draft', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    this.map.addLayer({ id: 'draft-fill', type: 'fill', source: 'draft', filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': ['get', 'colour'], 'fill-opacity': 0.2 } });
    this.map.addLayer({ id: 'draft-line', type: 'line', source: 'draft', filter: ['==', ['geometry-type'], 'LineString'],
      layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'colour'], 'line-width': 5, 'line-dasharray': [1.5, 1] } });
    this.map.addLayer({ id: 'draft-pts', type: 'circle', source: 'draft', filter: ['==', ['geometry-type'], 'Point'],
      paint: { 'circle-radius': 10, 'circle-color': '#ffffff', 'circle-stroke-color': ['get', 'colour'], 'circle-stroke-width': 4 } });
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
      if (this.onToolTap || e.touches.length !== 1 || (e.target as Element).closest?.('.maplibregl-marker')) return;
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
      if (this.onToolTap || (e.originalEvent.target as Element)?.closest?.('.maplibregl-marker')) return;
      e.preventDefault();
      this.onLongPress({ lat: e.lngLat.lat, lon: e.lngLat.lng });
    });
  }

  /**
   * Dragging a dot of the drawing being drawn or changed (onDraftDrag). A press within reach of a dot takes the
   * gesture from the map's own panning (MapLibre's preventDefault on mousedown / touchstart); anywhere else, the map
   * pans as usual. The click that ends a drag is swallowed, or it would add a point where the dot was dropped.
   */
  private bindDraftDrag(): void {
    const REACH_PX = 24;
    const start = (e: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) => {
      if (!this.onDraftDrag) return;
      if ('points' in e && e.points.length !== 1) return;
      const p = e.point;
      const hits = this.map.queryRenderedFeatures([[p.x - REACH_PX, p.y - REACH_PX], [p.x + REACH_PX, p.y + REACH_PX]], { layers: ['draft-pts'] });
      let best = -1, bestD = Infinity;
      for (const f of hits) {
        const c = (f.geometry as { coordinates?: [number, number] }).coordinates;
        const i = Number(f.properties?.i);
        if (!c || !Number.isInteger(i)) continue;
        const q = this.map.project(c);
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < bestD) { bestD = d; best = i; }
      }
      if (best < 0) return;
      e.preventDefault();
      this.dragIndex = best;
      this.suppressClickUntil = Number.POSITIVE_INFINITY;
    };
    const move = (e: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) => {
      if (this.dragIndex < 0) return;
      this.onDraftDrag?.(this.dragIndex, { lat: e.lngLat.lat, lon: e.lngLat.lng });
    };
    const end = () => {
      if (this.dragIndex < 0) return;
      this.dragIndex = -1;
      this.suppressClickUntil = Date.now() + 400;
    };
    this.map.on('mousedown', start);
    this.map.on('touchstart', start);
    this.map.on('mousemove', move);
    this.map.on('touchmove', move);
    this.map.on('mouseup', end);
    this.map.on('touchend', end);
    this.map.on('touchcancel', end);
    // A mouse let go outside the map still ends the drag.
    window.addEventListener('mouseup', end);
  }

  /** The map's zoom now (for mapShapes.metresPerPixel). */
  zoom(): number {
    return this.map?.getZoom() ?? 0;
  }

  /** The halo under the drawing or path whose card is open; null takes it away. */
  setPicked(geometry: { type: string; coordinates?: unknown } | null): void {
    (this.map?.getSource('picked') as maplibregl.GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: geometry ? [{ type: 'Feature', properties: {}, geometry }] : [],
    } as Parameters<maplibregl.GeoJSONSource['setData']>[0]);
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
    } else if (face.art) {
      const img = document.createElement('img');
      img.alt = '';
      img.className = 'me-photo';
      img.src = face.art;
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

  /**
   * Brings a place into the middle of what is still visible when a card covers the bottom `coveredPx` of the map
   * (and the top bar its top).
   */
  showAbove(lat: number, lon: number, coveredPx: number): void {
    const top = document.querySelector('.top-bar')?.getBoundingClientRect().bottom ?? 0;
    // Close enough that a photo spot's wedge is drawn at full size, so it can be seen turning.
    this.map.flyTo({ center: [lon, lat], zoom: Math.max(this.map.getZoom(), WEDGE_FULL_ZOOM), offset: [0, (top - coveredPx) / 2], duration: 800 });
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

  /**
   * Photo spots: a pin with the newest picture in it, over a wedge pointing the way the camera looked (none
   * when the way is not known). Field Mapper draws the cones UNDER the icons; here the wedges sit under every pin
   * (z-index in the CSS). A spot is redrawn when its picture, way or name changes.
   */
  setSpots(spots: PhotoSpot[]): void {
    const seen = new Set<string>();
    for (const s of spots) {
      if (typeof s.lat !== 'number' || typeof s.lon !== 'number') continue;
      seen.add(s.id);
      const bearing = spotBearing(s);
      const key = `${s.shots.length}|${newestShot(s)?.id ?? ''}|${bearing ?? ''}|${s.name ?? ''}|${s.lat},${s.lon}`;
      const had = this.spotMarkers.get(s.id);
      if (had?.key === key) continue;
      if (had) { had.pin.remove(); had.cone?.remove(); }
      const at: [number, number] = [s.lon, s.lat];
      const tap = (e: Event) => { e.stopPropagation(); this.onSpotTap(s.id); };
      const pin = this.spotPin(s.thumb, `${spotTitle(s)}: a photo spot`);
      pin.addEventListener('click', tap);
      const cone = typeof bearing === 'number' ? this.spotCone(bearing, at) : null;
      cone?.getElement().querySelector('path')?.addEventListener('click', tap);
      this.spotMarkers.set(s.id, { key, pin: new maplibregl.Marker({ element: pin, anchor: 'bottom' }).setLngLat(at).addTo(this.map), cone });
    }
    for (const [id, m] of this.spotMarkers) {
      if (!seen.has(id)) { m.pin.remove(); m.cone?.remove(); this.spotMarkers.delete(id); }
    }
  }

  /** The spot being saved, before it is: where it will be and which way it will look; null takes it away. */
  setSpotDraft(at: { lat: number; lon: number } | null, bearing?: number, thumb?: Blob): void {
    this.spotDraft?.pin.remove();
    this.spotDraft?.cone.remove();
    this.spotDraft = null;
    if (!at || !this.map) return;
    const lngLat: [number, number] = [at.lon, at.lat];
    const pin = this.spotPin(thumb, 'The photo spot you are saving');
    pin.classList.add('draft');
    pin.tabIndex = -1;
    const cone = this.spotCone(bearing ?? 0, lngLat);
    cone.getElement().classList.add('draft');
    cone.getElement().hidden = typeof bearing !== 'number';
    this.spotDraft = { pin: new maplibregl.Marker({ element: pin, anchor: 'bottom' }).setLngLat(lngLat).addTo(this.map), cone };
  }

  /**
   * The pin: a find pin (the same teardrop, standing above the point, so the explorer's own marker — on top, and
   * usually right where the spot was taken — covers only its tip), in the spot colour, with the picture or a camera.
   * The wedge starts at the point itself. The element MapLibre positions is the button; everything is drawn inside.
   */
  private spotPin(thumb: Blob | undefined, label: string): HTMLElement {
    const el = document.createElement('button');
    el.className = 'find-marker spot-marker';
    el.style.setProperty('--cat', SPOT_COLOUR);
    el.setAttribute('aria-label', label);
    // Everything drawn sits in one box that shrinks towards the pin's tip as the map zooms out (`--spot-pin-scale`).
    const art = document.createElement('span');
    art.className = 'spot-art';
    const pin = document.createElement('span');
    pin.className = 'find-pin';
    const face = document.createElement('span');
    face.className = 'find-pin-face';
    pin.append(face);
    const badge = document.createElement('span');
    badge.className = 'find-marker-emoji';
    badge.textContent = '📷';
    if (thumb) {
      const img = document.createElement('img');
      img.alt = '';
      face.append(img);
      el.classList.add('has-photo');
      queueMicrotask(() => { img.src = blobUrl(thumb, el); });
      art.append(badge);
    } else {
      face.append(badge);
    }
    art.prepend(pin);
    el.append(art);
    return el;
  }

  /** The wedge, its own marker aligned to the MAP (as the facing arrow is), so it points the real way. */
  private spotCone(bearing: number, at: [number, number]): Marker {
    const el = document.createElement('div');
    el.className = 'spot-cone';
    el.innerHTML = SPOT_CONE_SVG;
    return new maplibregl.Marker({ element: el, anchor: 'center', rotationAlignment: 'map', pitchAlignment: 'map' })
      .setLngLat(at).setRotation(bearing).addTo(this.map);
  }

  /** Forget every spot marker, so the next setSpots redraws them all. */
  clearSpots(): void {
    this.spotMarkers.forEach(m => { m.pin.remove(); m.cone?.remove(); });
    this.spotMarkers.clear();
  }

  /** Saved paths (purple) and the one recording now (orange). */
  setWalks(lines: [number, number][][], live: [number, number][][] | null): void {
    const fc = (ls: [number, number][][]) => ({
      type: 'FeatureCollection' as const,
      features: ls.filter(l => l.length > 1).map(coordinates => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates } })),
    });
    (this.map?.getSource('walks') as maplibregl.GeoJSONSource | undefined)?.setData(fc(lines));
    (this.map?.getSource('live-walk') as maplibregl.GeoJSONSource | undefined)?.setData(fc(live ?? []));
  }

  /** Saved drawings: lines, and shapes closed back to their first point. */
  setSketches(sketches: Sketch[]): void {
    (this.map?.getSource('sketches') as maplibregl.GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: sketches.filter(s => s.points.length > 1).map(s => ({
        type: 'Feature' as const, properties: { colour: s.colour },
        geometry: s.kind === 'area' && s.points.length > 2
          ? { type: 'Polygon' as const, coordinates: [[...s.points, s.points[0]]] }
          : { type: 'LineString' as const, coordinates: s.points },
      })),
    });
  }

  /** The shape being drawn or measured: its points, its line, and (an area) its fill. */
  setDraft(points: [number, number][], kind: 'line' | 'area', colour: string): void {
    const props = { colour };
    // Each dot carries its index, which is what a drag moves (bindDraftDrag).
    const features: { type: 'Feature'; properties: { colour: string; i?: number }; geometry: { type: 'Point'; coordinates: [number, number] } | { type: 'LineString'; coordinates: [number, number][] } | { type: 'Polygon'; coordinates: [number, number][][] } }[] = points.map((p, i) => ({ type: 'Feature', properties: { ...props, i }, geometry: { type: 'Point', coordinates: p } }));
    if (points.length > 1) {
      const line = kind === 'area' && points.length > 2 ? [...points, points[0]] : points;
      features.push({ type: 'Feature', properties: props, geometry: { type: 'LineString', coordinates: line } });
    }
    if (kind === 'area' && points.length > 2) {
      features.push({ type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [[...points, points[0]]] } });
    }
    (this.map?.getSource('draft') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features });
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
      // Broken where the GPS went quiet, as a recorded path is (walk.ts segmentsAtGaps).
      features: visible
        ? segmentsAtGaps(points.map(p => ({ lon: p[0], lat: p[1], t: p[2], acc: 0 }))).map(seg => ({
          type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: seg.map(p => [p.lon, p.lat]) },
        }))
        : [],
    });
  }
}

export interface Face {
  emoji: string;
  photo?: Blob;
  /** A storybook portrait's image (avatars.ts). */
  art?: string;
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

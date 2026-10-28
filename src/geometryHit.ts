// ============================================================
// COPIED from Fraxinus Field Mapper's `src/lib/geometryHit.ts` (with its test, `test/geometryHit.test.ts`): keep the
// two in step. Scout asks it which drawing or path is under a tap (shapePick.ts). The only change is the
// `GeoJSONGeometry` type, declared here because Scout has no shared GeoJSON types.
//
// Geometry hit-testing — "which ONE feature is under this tap?"
//
// Pure compute: no DOM, no MapLibre, no turf. The two tap-driven picks in the
// app (the editable-layer hit test in `App.hitTestFC`, and the single-click
// SELECT tool via `SelectionManager.selectAtPoint`) both ask the same question,
// and answered it two different ways — which is most of why single select felt
// unreliable.
//
// Three things this owns that the old per-call-site tests did not:
//
//  1. **Multi* geometry is measured, not skipped.** `hitTestFC` measured only
//     `Point`/`LineString`/`Polygon` and left everything else at `Infinity`, so a
//     MultiPolygon could not be tapped at all. That is exactly what a paste into
//     an editable layer produces — `pasteIntoEditableLayer` stores the clipboard
//     geometry verbatim — so the features people could not select were the ones
//     they had just pasted.
//  2. **A line is measured to its SEGMENTS, not to its vertices.** A
//     vertex-to-vertex minimum (what `selectionQuery.geodesicDistanceM` does, for
//     a different job) misses a tap in the middle of a long straight span, which
//     reads as "select doesn't work on that line".
//  3. **Ties are broken deterministically**: point before line before polygon —
//     matching the map's own draw order, so the thing you can see on top is the
//     thing you get — then nearest, then SMALLEST, so a pond inside a parcel is
//     reachable at all.
//
// Distances are computed in a local equirectangular frame centred on the tap.
// Over the tens of metres a tap tolerance spans that is accurate to well under a
// metre, and it costs no dependency and no trigonometry per coordinate.
//
// Tested in `test/geometryHit.test.ts`.
// ============================================================

/** Any GeoJSON geometry (only `type` and `coordinates` are read). */
export interface GeoJSONGeometry {
  type: string;
  coordinates?: unknown;
}

/** Metres per degree of latitude (spherical mean — the app's other geodesy is turf's). */
const M_PER_DEG_LAT = 111320;

/** Distances closer than this are one distance, and the next criterion decides. */
const TIE_M = 1e-6;

/** How close two shapes have to be for the pick to prefer the more specific one. */
export interface HitMeasure {
  /** Metres from the tap to the geometry; 0 when the tap falls inside a polygon. */
  distanceM: number;
  /** Point 0 · Line 1 · Polygon 2 · unrecognised 3. Lower wins. */
  rank: number;
  /** Bounding-box diagonal in metres — the tie-break when two shapes both hold the tap. */
  spanM: number;
}

/** Anything with a geometry can be picked; the caller keeps whatever else it holds. */
export interface HitItem {
  geometry?: GeoJSONGeometry | null;
}

const MISS: HitMeasure = { distanceM: Infinity, rank: 3, spanM: Infinity };

type XY = [number, number];

/** Point 0 · Line 1 · Polygon 2 · unrecognised 3, folding Multi* onto its part kind. */
export function geometryRank(g: GeoJSONGeometry | null | undefined): number {
  const t = (g as { type?: string } | null | undefined)?.type;
  if (t === 'Point' || t === 'MultiPoint') return 0;
  if (t === 'LineString' || t === 'MultiLineString') return 1;
  if (t === 'Polygon' || t === 'MultiPolygon') return 2;
  return 3;
}

/**
 * Measure one geometry against one tap.
 *
 * The whole geometry is projected once into metres relative to the tap, so the
 * tap itself is the origin and every test below is plain planar arithmetic.
 */
export function measureGeometry(
  g: GeoJSONGeometry | null | undefined,
  lng: number,
  lat: number,
): HitMeasure {
  const type = (g as { type?: string } | null | undefined)?.type;
  if (!type) return MISS;

  // A GeometryCollection is the one shape with no coordinates of its own; it is
  // vanishingly rare here, so it recurses rather than complicating the walk.
  if (type === 'GeometryCollection') {
    const parts = (g as unknown as { geometries?: unknown[] }).geometries;
    if (!Array.isArray(parts)) return MISS;
    let best = MISS;
    for (const part of parts) {
      const m = measureGeometry(part as GeoJSONGeometry, lng, lat);
      if (isFinite(m.distanceM) && betterHit(m, best)) best = m;
    }
    return best;
  }

  const mPerDegLon = Math.max(M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180), 1e-6);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  /** Project a coordinate list into metres about the tap, recording the extent. */
  const projectAll = (coords: unknown): XY[] => {
    const out: XY[] = [];
    if (!Array.isArray(coords)) return out;
    for (const c of coords) {
      if (!Array.isArray(c) || typeof c[0] !== 'number' || typeof c[1] !== 'number') continue;
      const x = (c[0] - lng) * mPerDegLon;
      const y = (c[1] - lat) * M_PER_DEG_LAT;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      out.push([x, y]);
    }
    return out;
  };

  const coordinates = (g as unknown as { coordinates?: unknown }).coordinates;
  let distanceM = Infinity;

  if (type === 'Point') {
    const [p] = projectAll([coordinates]);
    if (p) distanceM = Math.hypot(p[0], p[1]);
  } else if (type === 'MultiPoint') {
    for (const p of projectAll(coordinates)) distanceM = Math.min(distanceM, Math.hypot(p[0], p[1]));
  } else if (type === 'LineString') {
    distanceM = pathDistance(projectAll(coordinates));
  } else if (type === 'MultiLineString') {
    for (const part of asList(coordinates)) distanceM = Math.min(distanceM, pathDistance(projectAll(part)));
  } else if (type === 'Polygon') {
    distanceM = polygonDistance(asList(coordinates).map(projectAll));
  } else if (type === 'MultiPolygon') {
    // Every part is projected even once a containing one is found: `spanM` is the
    // extent of the WHOLE feature, and it is what settles a tie between two
    // shapes that both hold the tap.
    for (const poly of asList(coordinates)) {
      distanceM = Math.min(distanceM, polygonDistance(asList(poly).map(projectAll)));
    }
  } else {
    return MISS;
  }

  if (!isFinite(distanceM)) return MISS;
  const spanM = isFinite(minX) && isFinite(minY) ? Math.hypot(maxX - minX, maxY - minY) : Infinity;
  return { distanceM, rank: geometryRank(g), spanM };
}

/** Metres from the tap to a geometry; `Infinity` when it has no usable coordinates. */
export function distanceToPointM(
  g: GeoJSONGeometry | null | undefined,
  lng: number,
  lat: number,
): number {
  return measureGeometry(g, lng, lat).distanceM;
}

/**
 * Is `a` the better pick than `b`?
 *
 * Rank first, and deliberately so: a point marker sitting on a polygon is drawn
 * ON TOP of it, so a tap that lands on both has to give the point or the pick
 * disagrees with the picture. Distance then separates two shapes of one kind,
 * and the smaller extent settles a genuine tie — which is the only way a small
 * polygon inside a large one is ever reachable.
 */
export function betterHit(a: HitMeasure, b: HitMeasure): boolean {
  if (a.rank !== b.rank) return a.rank < b.rank;
  if (Math.abs(a.distanceM - b.distanceM) > TIE_M) return a.distanceM < b.distanceM;
  return a.spanM < b.spanM;
}

/**
 * The one item under a tap, or null when nothing is within `toleranceM`.
 *
 * Total and synchronous: the caller supplies the pool (which is where
 * visibility, selectability and project scope are decided) and this only ranks
 * it. A geometry that throws nothing and matches nothing simply loses.
 */
export function pickNearest<T extends HitItem>(
  items: readonly T[],
  lng: number,
  lat: number,
  toleranceM: number,
): T | null {
  const tol = Math.max(0, toleranceM);
  let best: T | null = null;
  let bestMeasure: HitMeasure | null = null;
  for (const item of items) {
    const g = item?.geometry;
    if (!g) continue;
    const m = measureGeometry(g, lng, lat);
    if (!(m.distanceM <= tol)) continue;
    if (!bestMeasure || betterHit(m, bestMeasure)) {
      best = item;
      bestMeasure = m;
    }
  }
  return best;
}

// ---- Planar helpers (the tap is the origin) ---------------------------------

function asList(coords: unknown): unknown[] {
  return Array.isArray(coords) ? coords : [];
}

/** Distance from the origin to a polyline. A one-vertex path is that vertex. */
function pathDistance(pts: XY[]): number {
  if (pts.length === 0) return Infinity;
  if (pts.length === 1) return Math.hypot(pts[0][0], pts[0][1]);
  let min = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const d = segmentDistance(pts[i - 1], pts[i]);
    if (d < min) min = d;
    if (min === 0) break;
  }
  return min;
}

/** 0 inside the outer ring (and outside every hole), else the nearest edge. */
function polygonDistance(rings: XY[][]): number {
  if (rings.length === 0 || rings[0].length === 0) return Infinity;
  let inHole = false;
  for (let i = 1; i < rings.length; i++) {
    if (ringContainsOrigin(rings[i])) { inHole = true; break; }
  }
  if (!inHole && ringContainsOrigin(rings[0])) return 0;
  let min = Infinity;
  for (const ring of rings) {
    const d = pathDistance(ring);
    if (d < min) min = d;
  }
  return min;
}

/** Distance from the origin to the segment AB. */
function segmentDistance(a: XY, b: XY): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(a[0], a[1]);
  // t minimises |A + t·D| — the projection of the origin onto the segment, clamped.
  let t = -(a[0] * dx + a[1] * dy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(a[0] + t * dx, a[1] + t * dy);
}

/** Even-odd ray cast along +x, testing the origin against a closed ring. */
function ringContainsOrigin(ring: XY[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > 0) === (yj > 0)) continue;
    // x where the edge crosses y = 0; the ray counts it only to the +x side.
    if (xi + ((0 - yi) * (xj - xi)) / (yj - yi) > 0) inside = !inside;
  }
  return inside;
}

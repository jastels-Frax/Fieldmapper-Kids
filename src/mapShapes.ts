import { pickNearest, type GeoJSONGeometry } from './geometryHit.ts';
import { areaKid, areaM2, areaWords, distanceKid, distanceWords, pathLengthM, perimeterM } from './measure.ts';
import { durationWords, segmentsAtGaps, walkDurationMs, walkLengthM, type Walk } from './walk.ts';
import type { Sketch } from './types.ts';

/**
 * Tapping a drawing or a recorded path on the map: which one is under the finger, and how it is described on its
 * card. Pure. The pick is Field Mapper's (`SelectionManager.selectAtPoint`): candidates measured against the tap
 * with `geometryHit.pickNearest` — a line to its segments, a shape counted from anywhere inside it, ties to the
 * smaller shape — rather than asking MapLibre which rendered feature was hit, which cannot be mapped back to an id.
 */

/**
 * How far from a line a tap still counts, in screen pixels. Field Mapper uses 14 (`TAP_TOLERANCE_PX`); a child's
 * fingertip is less exact than an adult's, and a drawing is thin, so Scout allows a little more.
 */
export const SHAPE_TAP_PX = 22;

export type Picked = { kind: 'sketch'; sketch: Sketch } | { kind: 'walk'; walk: Walk };

/** Metres on the ground per screen pixel at this latitude and zoom (MapLibre's 512-pixel tiles, Web Mercator). */
export function metresPerPixel(lat: number, zoom: number): number {
  return (40075016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);
}

/** A drawing as it is drawn: a shape closed back to its first point, or a line. */
export function sketchGeometry(s: Sketch): GeoJSONGeometry {
  return s.kind === 'area' && s.points.length > 2
    ? { type: 'Polygon', coordinates: [[...s.points, s.points[0]]] }
    : { type: 'LineString', coordinates: s.points };
}

/** A path as it is drawn: broken where the GPS went quiet, never bridged (segmentsAtGaps). */
export function walkGeometry(w: Walk): GeoJSONGeometry {
  return { type: 'MultiLineString', coordinates: segmentsAtGaps(w.points).map(seg => seg.map(p => [p.lon, p.lat])) };
}

/**
 * The drawing or path under a tap, or null. Only what is on the map takes part: the caller passes the drawings and
 * the finished paths it draws (none when paths are switched off), never one still recording.
 */
export function pickShape(sketches: Sketch[], walks: Walk[], lng: number, lat: number, toleranceM: number): Picked | null {
  const pool: (Picked & { geometry: GeoJSONGeometry })[] = [
    ...sketches.filter(s => s.points.length > 1).map(s => ({ kind: 'sketch' as const, sketch: s, geometry: sketchGeometry(s) })),
    ...walks.filter(w => w.endedAt && w.points.length > 1).map(w => ({ kind: 'walk' as const, walk: w, geometry: walkGeometry(w) })),
  ];
  const hit = pickNearest(pool, lng, lat, toleranceM);
  if (!hit) return null;
  return hit.kind === 'sketch' ? { kind: 'sketch', sketch: hit.sketch } : { kind: 'walk', walk: hit.walk };
}

export interface ShapeFacts {
  emoji: string;
  title: string;
  /** Short lines for the card, each one fact. */
  facts: string[];
}

/** What a drawing's card says: its name (or what it is) and how long or how big. */
export function sketchFacts(s: Sketch): ShapeFacts {
  if (s.kind === 'area' && s.points.length > 2) {
    const around = perimeterM(s.points), inside = areaM2(s.points);
    return {
      emoji: '⬠', title: s.name || 'My shape',
      facts: [`Inside: ${areaWords(inside)} · ${areaKid(inside)}`, `Around the edge: ${distanceWords(around)} · ${distanceKid(around)}`],
    };
  }
  const len = pathLengthM(s.points);
  return { emoji: '〰️', title: s.name || 'My line', facts: [`Long: ${distanceWords(len)} · ${distanceKid(len)}`] };
}

/** What a path's card says: how far and how long. */
export function walkFacts(w: Walk): ShapeFacts {
  return {
    emoji: '👣', title: w.name || 'My path',
    facts: [`Walked: ${distanceWords(walkLengthM(w.points))}`, `Exploring for ${durationWords(walkDurationMs(w))}`],
  };
}

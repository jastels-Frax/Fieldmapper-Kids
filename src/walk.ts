import { distanceM } from './geo.ts';

/**
 * A recorded path ("Record my path"): GPS fixes streamed while the explorer
 * walks, kept only where they are movement rather than wobble. Pure.
 */
export interface WalkPoint {
  lon: number;
  lat: number;
  /** epoch ms */
  t: number;
  /** metres, the device's own estimate */
  acc: number;
}

export interface Walk {
  id: string;
  profileId?: string;
  startedAt: string;
  /** Absent while it is being recorded. */
  endedAt?: string;
  name?: string;
  points: WalkPoint[];
}

/** A fix worse than this says too little about where the explorer is. */
export const MAX_ACCURACY_M = 35;
/** Faster than this between two fixes is a GPS jump, not a child walking (or riding a bike). */
export const MAX_SPEED_MS = 12;

export type Verdict = 'kept' | 'fuzzy' | 'too-close' | 'jump';

/**
 * Whether a new fix joins the path. It must be sharp enough, far enough from the
 * last kept point to be real movement (at least 5 m, more when the fix is fuzzy)
 * and not an impossible leap.
 */
export function judgePoint(points: WalkPoint[], p: WalkPoint): Verdict {
  if (!(p.acc <= MAX_ACCURACY_M)) return 'fuzzy';
  const last = points[points.length - 1];
  if (!last) return 'kept';
  const d = distanceM(last.lat, last.lon, p.lat, p.lon);
  if (d < Math.max(5, p.acc / 2)) return 'too-close';
  const dt = (p.t - last.t) / 1000;
  if (dt > 0 && d / dt > MAX_SPEED_MS) return 'jump';
  return 'kept';
}

export function addPoint(points: WalkPoint[], p: WalkPoint): { points: WalkPoint[]; verdict: Verdict } {
  const verdict = judgePoint(points, p);
  return { points: verdict === 'kept' ? [...points, p] : points, verdict };
}

/** No fix for this long means the GPS stopped (screen off, app closed): the line is broken there, not bridged. */
export const GAP_MS = 2 * 60_000;

/**
 * The path as the pieces actually walked: split wherever the GPS went quiet for `GAP_MS` or more, so a phone
 * pocketed with the screen off does not draw a straight line across ground nobody recorded. Pieces of one point
 * are dropped (a line needs two).
 */
export function segmentsAtGaps(points: WalkPoint[], gapMs = GAP_MS): WalkPoint[][] {
  const out: WalkPoint[][] = [];
  let cur: WalkPoint[] = [];
  for (const p of points) {
    const last = cur[cur.length - 1];
    if (last && p.t - last.t >= gapMs) { out.push(cur); cur = []; }
    cur.push(p);
  }
  out.push(cur);
  return out.filter(s => s.length > 1);
}

export function walkLengthM(points: WalkPoint[]): number {
  let m = 0;
  for (let i = 1; i < points.length; i++) m += distanceM(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
  return m;
}

/** Duration from the start to the end (or to `now` while recording). */
export function walkDurationMs(w: Walk, now = Date.now()): number {
  const start = Date.parse(w.startedAt);
  const end = w.endedAt ? Date.parse(w.endedAt) : now;
  return Math.max(0, end - start);
}

export function distanceWords(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

export function durationWords(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 1) return 'less than a minute';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${min % 60} min`;
}

/** A walk that was being recorded when the app closed ends at its last point. */
export function closeOrphan(w: Walk): Walk {
  if (w.endedAt) return w;
  const last = w.points[w.points.length - 1];
  return { ...w, endedAt: new Date(last ? last.t : Date.parse(w.startedAt)).toISOString() };
}

export function walkGeoJSON(w: Walk, explorer = ''): object {
  return {
    type: 'Feature',
    geometry: w.points.length >= 2 ? { type: 'LineString', coordinates: w.points.map(p => [p.lon, p.lat]) } : null,
    properties: {
      id: w.id, explorer, name: w.name ?? '', started: w.startedAt, ended: w.endedAt ?? '',
      length_m: Math.round(walkLengthM(w.points)), minutes: Math.round(walkDurationMs(w) / 60000), points: w.points.length,
      times: w.points.map(p => new Date(p.t).toISOString()),
    },
  };
}

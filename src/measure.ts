import { distanceM } from './geo.ts';

/**
 * Lengths and areas for the measure and sketch tools, and how to say them to a child. Pure.
 * Field Mapper's MeasurePanel measures with turf (`turf.length`, `turf.area`); Scout carries no turf, so the
 * length is the same great-circle sum (geo.distanceM) and the area is turf's own `ringArea`, copied below.
 */
export type LonLat = [number, number];

export function pathLengthM(points: LonLat[]): number {
  let m = 0;
  for (let i = 1; i < points.length; i++) m += distanceM(points[i - 1][1], points[i - 1][0], points[i][1], points[i][0]);
  return m;
}

/** The shape's outline: the path closed back to its first point. */
export function perimeterM(points: LonLat[]): number {
  return points.length < 3 ? pathLengthM(points) : pathLengthM([...points, points[0]]);
}

const RADIUS = 6378137;
const rad = (d: number) => (d * Math.PI) / 180;

/** Area of a ring in square metres: @turf/area's `ringArea` (Chamberlain & Duquette), for an open or closed ring. */
export function areaM2(points: LonLat[]): number {
  const n = points.length;
  if (n < 3) return 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const lower = i === n - 2 ? n - 2 : i === n - 1 ? n - 1 : i;
    const middle = i === n - 2 ? n - 1 : i === n - 1 ? 0 : i + 1;
    const upper = i === n - 2 ? 0 : i === n - 1 ? 1 : i + 2;
    total += (rad(points[upper][0]) - rad(points[lower][0])) * Math.sin(rad(points[middle][1]));
  }
  return Math.abs((total * RADIUS * RADIUS) / 2);
}

/** A child's walking step, roughly (ages 5–10 walk about half a metre a step). */
export const KID_STEP_M = 0.5;

export function distanceWords(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(m < 10_000 ? 2 : 1)} km`;
}

/** "about 46 kid steps", "about 3 km of walking" */
export function distanceKid(m: number): string {
  if (m < 1) return 'less than a step';
  if (m < 2000) return `about ${Math.max(1, Math.round(m / KID_STEP_M)).toLocaleString()} kid steps`;
  return `a long walk!`;
}

export function areaWords(m2: number): string {
  if (m2 < 10_000) return `${Math.round(m2).toLocaleString()} m²`;
  return `${(m2 / 10_000).toFixed(m2 < 100_000 ? 2 : 1)} hectares`;
}

/** Bedrooms (about 12 m²), tennis courts (about 260 m²), soccer fields (about 7,000 m²). */
export function areaKid(m2: number): string {
  const n = (x: number) => (x < 10 ? Math.round(x * 2) / 2 : Math.round(x)).toLocaleString();
  if (m2 < 6) return 'smaller than a bedroom';
  if (m2 < 130) return `about ${n(m2 / 12)} bedroom${m2 / 12 >= 1.25 ? 's' : ''}`;
  if (m2 < 3500) return `about ${n(m2 / 260)} tennis court${m2 / 260 >= 1.25 ? 's' : ''}`;
  return `about ${n(m2 / 7000)} soccer field${m2 / 7000 >= 1.25 ? 's' : ''}`;
}
